import { describe, expect, it } from 'vitest'
import type { PomodoroSession, Task } from '../../../shared/types'
import { computeDailyStats } from './dailyStats'

describe('computeDailyStats', () => {
  it('counts only completed focus sessions for the requested local day', () => {
    const tasks: Task[] = [{ id: 't1', title: '英语', status: 'active', createdAt: '2026-07-14T00:00:00.000Z' }]
    const sessions: PomodoroSession[] = [
      { id: 's1', taskId: 't1', type: 'focus', plannedMs: 1_500_000, startedAt: '2026-07-14T01:00:00.000Z', endedAt: '2026-07-14T01:25:00.000Z', completed: true },
      { id: 's2', taskId: 't1', type: 'focus', plannedMs: 1_500_000, startedAt: '2026-07-14T02:00:00.000Z', endedAt: '2026-07-14T02:10:00.000Z', completed: false },
      { id: 's3', type: 'shortBreak', plannedMs: 300_000, startedAt: '2026-07-14T01:25:00.000Z', endedAt: '2026-07-14T01:30:00.000Z', completed: true },
    ]

    const stats = computeDailyStats(sessions, tasks, '2026-07-14', 'UTC')
    expect(stats.completedFocusCount).toBe(1)
    expect(stats.focusMs).toBe(1_500_000)
    expect(stats.byTask[0]).toMatchObject({ taskId: 't1', completedFocusCount: 1 })
  })
})
