/// <reference types="vite/client" />
import type { DailyStats, FocusPreset, Settings, Task, TimerSnapshot } from '../shared/types'

declare global {
interface Window {
  xueke: {
    getState: () => Promise<{ timer: TimerSnapshot; currentTaskId?: string }>
    timer: { start: () => Promise<TimerSnapshot>; pause: () => Promise<TimerSnapshot>; resume: () => Promise<TimerSnapshot>; skip: () => Promise<TimerSnapshot> }
    window: { showMini: () => Promise<void>; showMain: () => Promise<void> }
    media: { restMusicUrl: () => Promise<string> }
    tasks: { list: () => Promise<Task[]>; create: (input: { title: string; note?: string }) => Promise<Task>; update: (id: string, input: Partial<Task>) => Promise<Task>; delete: (id: string) => Promise<void>; setCurrent: (id?: string) => Promise<void> }
    settings: { get: () => Promise<Settings>; update: (input: Partial<Settings>) => Promise<Settings> }
    focusPresets: { list: () => Promise<FocusPreset[]>; create: (input: Omit<FocusPreset, 'id'>) => Promise<FocusPreset>; update: (id: string, input: Omit<FocusPreset, 'id'>) => Promise<FocusPreset>; delete: (id: string) => Promise<void> }
    stats: { today: () => Promise<DailyStats> }
    onTimerTick: (callback: (value: TimerSnapshot) => void) => () => void
    onPhaseEnded: (callback: (value: { phase: string; completed: boolean }) => void) => () => void
    onCompletionSound: (callback: (phase: TimerSnapshot['phase']) => void) => () => void
    onDataChanged: (callback: () => void) => () => void
    onStoreError: (callback: (value: { message: string }) => void) => () => void
  }
}
}

export {}
