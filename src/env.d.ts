/// <reference types="vite/client" />
import type { DailyStats, Settings, Task, TimerSnapshot } from '../shared/types'

declare global {
interface Window {
  xueke: {
    getState: () => Promise<{ timer: TimerSnapshot; currentTaskId?: string }>
    timer: { start: () => Promise<TimerSnapshot>; pause: () => Promise<TimerSnapshot>; resume: () => Promise<TimerSnapshot>; skip: () => Promise<TimerSnapshot> }
    tasks: { list: () => Promise<Task[]>; create: (input: { title: string; note?: string }) => Promise<Task>; update: (id: string, input: Partial<Task>) => Promise<Task>; delete: (id: string) => Promise<void>; setCurrent: (id?: string) => Promise<void> }
    settings: { get: () => Promise<Settings>; update: (input: Partial<Settings>) => Promise<Settings> }
    stats: { today: () => Promise<DailyStats> }
    onTimerTick: (callback: (value: TimerSnapshot) => void) => () => void
    onPhaseEnded: (callback: (value: { phase: string; completed: boolean }) => void) => () => void
    onStoreError: (callback: (value: { message: string }) => void) => () => void
  }
}
}

export {}
