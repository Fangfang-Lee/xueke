import type { DailyStats, PomodoroSession, Task } from '../../../shared/types'

export function computeDailyStats(
  sessions: PomodoroSession[],
  tasks: Task[],
  date: string,
  timeZone: string,
): DailyStats {
  const taskTitles = new Map(tasks.map((task) => [task.id, task.title]))
  const historicalTaskTitles = new Map<string, string>()
  const totals = new Map<string | null, { completedFocusCount: number; focusMs: number }>()
  const completedSessions: DailyStats['sessions'] = []

  for (const session of sessions) {
    if (session.type !== 'focus' || !session.completed || !session.endedAt || localDate(session.startedAt, timeZone) !== date) continue

    const duration = session.plannedMs
    const taskId = session.taskId ?? null
    if (taskId && session.taskTitle) historicalTaskTitles.set(taskId, session.taskTitle)
    const title = session.taskTitle ?? (taskId ? taskTitles.get(taskId) ?? '已删除任务' : '未绑定任务')
    const current = totals.get(taskId) ?? { completedFocusCount: 0, focusMs: 0 }
    current.completedFocusCount += 1
    current.focusMs += duration
    totals.set(taskId, current)
    completedSessions.push({ id: session.id, taskId, title, startedAt: session.startedAt, endedAt: session.endedAt, focusMs: duration })
  }

  const byTask = [...totals.entries()]
    .map(([taskId, total]) => ({
      taskId,
      title: taskId ? taskTitles.get(taskId) ?? historicalTaskTitles.get(taskId) ?? '已删除任务' : '未绑定任务',
      ...total,
    }))
    .sort((a, b) => b.focusMs - a.focusMs)

  return {
    date,
    completedFocusCount: byTask.reduce((sum, item) => sum + item.completedFocusCount, 0),
    focusMs: byTask.reduce((sum, item) => sum + item.focusMs, 0),
    byTask,
    sessions: completedSessions.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)),
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
