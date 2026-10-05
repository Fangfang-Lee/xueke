export type TaskStatus = 'active' | 'completed'

export interface Task {
  id: string
  title: string
  note?: string
  status: TaskStatus
  createdAt: string
  completedAt?: string
}

export type SessionType = 'focus' | 'shortBreak' | 'longBreak'

export interface PomodoroSession {
  id: string
  taskId?: string
  type: SessionType
  plannedMs: number
  startedAt: string
  endedAt?: string
  completed: boolean
}

export interface Settings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakInterval: number
  soundEnabled: boolean
  notificationEnabled: boolean
  restSoundMode: 'quiet' | 'music'
  locale: 'zh-CN'
}

export interface FocusPreset {
  id: string
  name: string
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakInterval: number
}

export type TimerPhase = SessionType
export type TimerStatus = 'idle' | 'running' | 'paused'

export interface TimerSnapshot {
  status: TimerStatus
  phase: TimerPhase
  remainingMs: number
  plannedMs: number
  startedAt?: string
  completedFocusCountInCycle: number
  currentTaskId?: string
  activeSessionId?: string
}

export interface DailyStats {
  date: string
  completedFocusCount: number
  focusMs: number
  byTask: Array<{
    taskId: string | null
    title: string
    completedFocusCount: number
    focusMs: number
  }>
}

export interface AppData {
  version: 1
  tasks: Task[]
  sessions: PomodoroSession[]
  settings: Settings
  customFocusPresets: FocusPreset[]
  currentTaskId?: string
}
