import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import { DEFAULT_SETTINGS } from '../../../shared/defaults'
import type { AppData, FocusPreset, PomodoroSession, SessionType, Settings, Task, TimerSnapshot } from '../../../shared/types'
import { AppStore } from '../store/appStore'

const idleTimer = (): TimerSnapshot => ({ status: 'idle', phase: 'focus', remainingMs: DEFAULT_SETTINGS.focusMinutes * 60_000, plannedMs: DEFAULT_SETTINGS.focusMinutes * 60_000, completedFocusCountInCycle: 0 })

export class SessionService extends EventEmitter {
  private data!: AppData
  private timer = idleTimer()
  private endsAt?: number
  private interval?: NodeJS.Timeout
  private ending?: Promise<void>
  private recoveryNotice?: string

  constructor(private readonly store: AppStore) { super() }

  async initialize(): Promise<void> {
    this.data = await this.store.load()
    const initialDuration = this.duration(this.timer.phase)
    this.timer = { ...this.timer, plannedMs: initialDuration, remainingMs: initialDuration }
    if (this.store.consumeRecoveryNotice()) this.recoveryNotice = '本地数据文件已损坏，已备份原文件并恢复为空白数据。'
    const interruptedAt = new Date().toISOString()
    for (const session of this.data.sessions) {
      if (!session.endedAt) { session.completed = false; session.endedAt = interruptedAt }
    }
    if (this.data.currentTaskId && !this.data.tasks.some((task) => task.id === this.data.currentTaskId && task.status === 'active')) this.data.currentTaskId = undefined
    await this.persist()
    this.interval = setInterval(() => void this.tick(), 500)
  }
  dispose(): void { if (this.interval) clearInterval(this.interval) }
  snapshot(): TimerSnapshot { return { ...this.timer } }
  state(): { timer: TimerSnapshot; currentTaskId?: string } { return { timer: this.snapshot(), currentTaskId: this.data.currentTaskId } }
  tasks(): Task[] { return [...this.data.tasks] }
  sessions(): PomodoroSession[] { return [...this.data.sessions] }
  settings(): Settings { return { ...this.data.settings } }
  focusPresets(): FocusPreset[] { return this.data.customFocusPresets.map((preset) => ({ ...preset })) }
  consumeRecoveryNotice(): string | undefined { const notice = this.recoveryNotice; this.recoveryNotice = undefined; return notice }

  async start(): Promise<TimerSnapshot> {
    if (this.timer.status !== 'idle') return this.snapshot()
    const plannedMs = this.duration(this.timer.phase)
    const currentTask = this.timer.phase === 'focus' ? this.data.tasks.find((task) => task.id === this.data.currentTaskId && task.status === 'active') : undefined
    const session: PomodoroSession = { id: randomUUID(), taskId: currentTask?.id, taskTitle: currentTask?.title, type: this.timer.phase, plannedMs, startedAt: new Date().toISOString(), completed: false }
    this.data.sessions.push(session)
    this.timer = { ...this.timer, status: 'running', plannedMs, remainingMs: plannedMs, startedAt: session.startedAt, activeSessionId: session.id, currentTaskId: session.taskId, currentTaskTitle: session.taskTitle }
    this.endsAt = Date.now() + plannedMs
    await this.persist(); this.emit('tick', this.snapshot()); return this.snapshot()
  }
  pause(): TimerSnapshot { if (this.timer.status === 'running') { this.refresh(); this.timer.status = 'paused'; this.endsAt = undefined; this.emit('tick', this.snapshot()) } return this.snapshot() }
  resume(): TimerSnapshot { if (this.timer.status === 'paused') { this.timer.status = 'running'; this.endsAt = Date.now() + this.timer.remainingMs; this.emit('tick', this.snapshot()) } return this.snapshot() }
  async skip(): Promise<TimerSnapshot> { if (this.timer.status !== 'idle') await this.finish(false, this.timer.phase !== 'focus'); return this.snapshot() }
  async createTask(input: { title: string; note?: string }): Promise<Task> {
    const title = this.validateTaskTitle(input.title)
    const task: Task = { id: randomUUID(), title, note: this.validateTaskNote(input.note), status: 'active', createdAt: new Date().toISOString() }
    this.data.tasks.push(task); await this.persist(); return task
  }
  async updateTask(id: string, input: Partial<Pick<Task, 'title' | 'note' | 'status'>>): Promise<Task> {
    const task = this.data.tasks.find((item) => item.id === id); if (!task) throw new Error('任务不存在')
    if (input.title !== undefined) task.title = this.validateTaskTitle(input.title)
    if (input.note !== undefined) task.note = this.validateTaskNote(input.note)
    if (input.status !== undefined) { task.status = input.status; task.completedAt = input.status === 'completed' ? new Date().toISOString() : undefined; if (input.status === 'completed' && this.data.currentTaskId === id) this.data.currentTaskId = undefined }
    await this.persist(); return task
  }
  async deleteTask(id: string): Promise<void> { const task = this.data.tasks.find((item) => item.id === id); if (!task) throw new Error('任务不存在'); for (const session of this.data.sessions) if (session.taskId === id && !session.taskTitle) session.taskTitle = task.title; this.data.tasks = this.data.tasks.filter((item) => item.id !== id); if (this.data.currentTaskId === id) this.data.currentTaskId = undefined; await this.persist() }
  async setCurrentTask(id?: string): Promise<void> { const task = id ? this.data.tasks.find((item) => item.id === id) : undefined; if (id && !task) throw new Error('任务不存在'); if (task?.status === 'completed') throw new Error('已完成任务不能设为当前任务'); this.data.currentTaskId = id; await this.persist() }
  async updateSettings(input: Partial<Settings>): Promise<Settings> {
    const next = { ...this.data.settings, ...input }; if (![next.focusMinutes, next.shortBreakMinutes, next.longBreakMinutes, next.longBreakInterval].every((n) => Number.isInteger(n) && n > 0)) throw new Error('时长和间隔必须是正整数')
    this.data.settings = next; if (this.timer.status === 'idle') { const ms = this.duration(this.timer.phase); this.timer = { ...this.timer, plannedMs: ms, remainingMs: ms } }; await this.persist(); return this.settings()
  }
  async createFocusPreset(input: Omit<FocusPreset, 'id'>): Promise<FocusPreset> {
    const preset = { id: randomUUID(), ...this.validateFocusPreset(input) }
    this.data.customFocusPresets.push(preset); await this.persist(); return preset
  }
  async updateFocusPreset(id: string, input: Omit<FocusPreset, 'id'>): Promise<FocusPreset> {
    const index = this.data.customFocusPresets.findIndex((preset) => preset.id === id); if (index < 0) throw new Error('专注方案不存在')
    const preset = { id, ...this.validateFocusPreset(input) }; this.data.customFocusPresets[index] = preset; await this.persist(); return preset
  }
  async deleteFocusPreset(id: string): Promise<void> {
    const count = this.data.customFocusPresets.length; this.data.customFocusPresets = this.data.customFocusPresets.filter((preset) => preset.id !== id)
    if (this.data.customFocusPresets.length === count) throw new Error('专注方案不存在'); await this.persist()
  }
  private async tick(): Promise<void> { if (this.timer.status !== 'running') return; this.refresh(); if (this.timer.remainingMs <= 0) await this.finish(true); else this.emit('tick', this.snapshot()) }
  private refresh(): void { if (this.endsAt) this.timer.remainingMs = Math.max(0, this.endsAt - Date.now()) }
  private finish(completed: boolean, autoStart = completed): Promise<void> {
    if (this.ending) return this.ending
    this.ending = this.doFinish(completed, autoStart).finally(() => { this.ending = undefined })
    return this.ending
  }
  private async doFinish(completed: boolean, autoStart: boolean): Promise<void> {
    const session = this.data.sessions.find((item) => item.id === this.timer.activeSessionId); if (session) { session.completed = completed; session.endedAt = new Date().toISOString() }
    const previousPhase = this.timer.phase; const focusDone = completed && previousPhase === 'focus' ? this.timer.completedFocusCountInCycle + 1 : this.timer.completedFocusCountInCycle
    const nextPhase: SessionType = previousPhase === 'focus' ? (focusDone >= this.data.settings.longBreakInterval ? 'longBreak' : 'shortBreak') : 'focus'
    this.timer = { ...idleTimer(), phase: nextPhase, completedFocusCountInCycle: nextPhase === 'longBreak' ? 0 : focusDone }
    const ms = this.duration(nextPhase); this.timer.plannedMs = ms; this.timer.remainingMs = ms; this.endsAt = undefined
    await this.persist(); this.emit('phaseEnded', { phase: previousPhase, completed }); this.emit('tick', this.snapshot())
    if (autoStart) await this.start()
  }
  private duration(phase: SessionType): number { const s = this.data.settings; return (phase === 'focus' ? s.focusMinutes : phase === 'shortBreak' ? s.shortBreakMinutes : s.longBreakMinutes) * 60_000 }
  private validateFocusPreset(input: Omit<FocusPreset, 'id'>): Omit<FocusPreset, 'id'> {
    const name = input.name.trim(); if (!name || name.length > 50) throw new Error('方案名称需为 1 至 50 个字符')
    const values = [input.focusMinutes, input.shortBreakMinutes, input.longBreakMinutes, input.longBreakInterval]
    if (!values.every((value) => Number.isInteger(value) && value > 0)) throw new Error('时长和间隔必须是正整数')
    return { ...input, name }
  }
  private validateTaskTitle(value: string): string { const title = value.trim(); if (!title) throw new Error('任务名称不能为空'); if (title.length > 80) throw new Error('任务名称不能超过 80 个字符'); return title }
  private validateTaskNote(value?: string): string | undefined { const note = value?.trim() || undefined; if (note && note.length > 500) throw new Error('任务备注不能超过 500 个字符'); return note }
  private async persist(): Promise<void> { await this.store.save(this.data); this.emit('dataChanged') }
}
