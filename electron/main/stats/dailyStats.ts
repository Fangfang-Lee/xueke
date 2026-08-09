import type { DailyStats, PomodoroSession, Task } from '../../../shared/types'

export function computeDailyStats(
  sessions: PomodoroSession[],
  tasks: Task[],
  date: string,
  timeZone: string,
): DailyStats {
  const taskTitles = new Map(tasks.map((task) => [task.id, task.title]))
  const totals = new Map<string | null, { completedFocusCount: number; focusMs: number }>()

  for (const session of sessions) {
    if (session.type !== 'focus' || !session.completed || !session.endedAt || localDate(session.startedAt, timeZone) !== date) continue

    const duration = Math.max(0, Date.parse(session.endedAt) - Date.parse(session.startedAt))
    const taskId = session.taskId ?? null
    const current = totals.get(taskId) ?? { completedFocusCount: 0, focusMs: 0 }
    current.completedFocusCount += 1
    current.focusMs += duration
    totals.set(taskId, current)
  }

  const byTask = [...totals.entries()]
    .map(([taskId, total]) => ({
      taskId,
      title: taskId ? taskTitles.get(taskId) ?? '已删除任务' : '未绑定任务',
      ...total,
    }))
    .sort((a, b) => b.focusMs - a.focusMs)

  return {
    date,
    completedFocusCount: byTask.reduce((sum, item) => sum + item.completedFocusCount, 0),
    focusMs: byTask.reduce((sum, item) => sum + item.focusMs, 0),
    byTask,
  }
}

function localDate(isoDate: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(isoDate))
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
