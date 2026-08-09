import type { AppData, Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  soundEnabled: true,
  notificationEnabled: true,
  locale: 'zh-CN',
}

export function createEmptyAppData(): AppData {
  return {
    version: 1,
    tasks: [],
    sessions: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}
