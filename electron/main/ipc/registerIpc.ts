import { app, BrowserWindow, ipcMain, Notification } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { IpcChannels } from '../../../shared/ipc'
import { computeDailyStats } from '../stats/dailyStats'
import { SessionService } from '../services/sessionService'

const validId = (value: unknown): string | undefined => typeof value === 'string' && value.length > 0 ? value : undefined
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const taskUpdate = (value: unknown): { title?: string; note?: string; status?: 'active' | 'completed' } => {
  if (!isRecord(value)) throw new Error('参数无效')
  const { title, note, status } = value
  if ((title !== undefined && typeof title !== 'string') || (note !== undefined && typeof note !== 'string') || (status !== undefined && status !== 'active' && status !== 'completed')) throw new Error('参数无效')
  return { title: title as string | undefined, note: note as string | undefined, status: status as 'active' | 'completed' | undefined }
}
const settingsUpdate = (value: unknown): Record<string, never> | { focusMinutes?: number; shortBreakMinutes?: number; longBreakMinutes?: number; longBreakInterval?: number; soundEnabled?: boolean; notificationEnabled?: boolean; restSoundMode?: 'quiet' | 'music'; locale?: 'zh-CN' } => {
  if (!isRecord(value)) throw new Error('参数无效')
  const allowed = new Set(['focusMinutes', 'shortBreakMinutes', 'longBreakMinutes', 'longBreakInterval', 'soundEnabled', 'notificationEnabled', 'restSoundMode', 'locale'])
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('参数无效')
  for (const key of ['focusMinutes', 'shortBreakMinutes', 'longBreakMinutes', 'longBreakInterval']) if (value[key] !== undefined && (typeof value[key] !== 'number' || !Number.isInteger(value[key]) || value[key] <= 0)) throw new Error('参数无效')
  for (const key of ['soundEnabled', 'notificationEnabled']) if (value[key] !== undefined && typeof value[key] !== 'boolean') throw new Error('参数无效')
  if (value.restSoundMode !== undefined && value.restSoundMode !== 'quiet' && value.restSoundMode !== 'music') throw new Error('参数无效')
  if (value.locale !== undefined && value.locale !== 'zh-CN') throw new Error('参数无效')
  return value as { focusMinutes?: number; shortBreakMinutes?: number; longBreakMinutes?: number; longBreakInterval?: number; soundEnabled?: boolean; notificationEnabled?: boolean; restSoundMode?: 'quiet' | 'music'; locale?: 'zh-CN' }
}
const focusPresetInput = (value: unknown): { name: string; focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakInterval: number } => {
  if (!isRecord(value) || typeof value.name !== 'string') throw new Error('参数无效')
  const numericKeys = ['focusMinutes', 'shortBreakMinutes', 'longBreakMinutes', 'longBreakInterval'] as const
  if (Object.keys(value).some((key) => key !== 'name' && !numericKeys.includes(key as typeof numericKeys[number])) || numericKeys.some((key) => typeof value[key] !== 'number' || !Number.isInteger(value[key]) || value[key] <= 0)) throw new Error('参数无效')
  return value as { name: string; focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakInterval: number }
}
export function registerIpc(service: SessionService, windowActions: { showMini: () => void; showMain: () => void; playCompletionSound: (phase: 'focus' | 'shortBreak' | 'longBreak') => void }): void {
  ipcMain.handle(IpcChannels.getState, () => service.state())
  ipcMain.handle(IpcChannels.timerStart, () => service.start())
  ipcMain.handle(IpcChannels.timerPause, () => service.pause())
  ipcMain.handle(IpcChannels.timerResume, () => service.resume())
  ipcMain.handle(IpcChannels.timerSkip, () => service.skip())
  ipcMain.handle(IpcChannels.windowShowMini, () => windowActions.showMini())
  ipcMain.handle(IpcChannels.windowShowMain, () => windowActions.showMain())
  ipcMain.handle(IpcChannels.mediaRestMusicUrl, () => pathToFileURL(join(app.isPackaged ? process.resourcesPath : process.cwd(), 'resources', 'audio', 'duru-roomscene-lofi.mp3')).toString())
  ipcMain.handle(IpcChannels.tasksList, () => service.tasks())
  ipcMain.handle(IpcChannels.tasksCreate, (_e, input: unknown) => { if (!input || typeof input !== 'object') throw new Error('参数无效'); const v = input as { title?: unknown; note?: unknown }; if (typeof v.title !== 'string' || (v.note !== undefined && typeof v.note !== 'string')) throw new Error('参数无效'); return service.createTask({ title: v.title, note: v.note }) })
  ipcMain.handle(IpcChannels.tasksUpdate, (_e, id: unknown, input: unknown) => { const taskId = validId(id); if (!taskId) throw new Error('参数无效'); return service.updateTask(taskId, taskUpdate(input)) })
  ipcMain.handle(IpcChannels.tasksDelete, (_e, id: unknown) => { const taskId = validId(id); if (!taskId) throw new Error('参数无效'); return service.deleteTask(taskId) })
  ipcMain.handle(IpcChannels.tasksSetCurrent, (_e, id: unknown) => service.setCurrentTask(validId(id)))
  ipcMain.handle(IpcChannels.settingsGet, () => service.settings())
  ipcMain.handle(IpcChannels.settingsUpdate, (_e, input: unknown) => service.updateSettings(settingsUpdate(input)))
  ipcMain.handle(IpcChannels.focusPresetsList, () => service.focusPresets())
  ipcMain.handle(IpcChannels.focusPresetsCreate, (_e, input: unknown) => service.createFocusPreset(focusPresetInput(input)))
  ipcMain.handle(IpcChannels.focusPresetsUpdate, (_e, id: unknown, input: unknown) => { const presetId = validId(id); if (!presetId) throw new Error('参数无效'); return service.updateFocusPreset(presetId, focusPresetInput(input)) })
  ipcMain.handle(IpcChannels.focusPresetsDelete, (_e, id: unknown) => { const presetId = validId(id); if (!presetId) throw new Error('参数无效'); return service.deleteFocusPreset(presetId) })
  ipcMain.handle(IpcChannels.statsToday, () => { const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const values = Object.fromEntries(parts.map((part) => [part.type, part.value])); const date = `${values.year}-${values.month}-${values.day}`; return computeDailyStats(service.sessions(), service.tasks(), date, timeZone) })
  service.on('tick', (snapshot) => BrowserWindow.getAllWindows().forEach((window) => window.webContents.send(IpcChannels.timerTick, snapshot)))
  service.on('phaseEnded', (event) => { BrowserWindow.getAllWindows().forEach((window) => window.webContents.send(IpcChannels.timerPhaseEnded, event)); if (service.settings().notificationEnabled && Notification.isSupported()) new Notification({ title: '学刻', body: event.completed ? '阶段完成，已自动开始下一阶段。' : '本阶段已跳过。' }).show(); if (service.settings().soundEnabled && event.completed) windowActions.playCompletionSound(event.phase) })
  service.on('error', (error) => BrowserWindow.getAllWindows().forEach((window) => window.webContents.send(IpcChannels.storeError, { message: error instanceof Error ? error.message : '保存失败' })))
}
