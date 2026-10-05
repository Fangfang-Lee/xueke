import React, { useEffect, useState } from 'react'
import type { DailyStats, FocusPreset, Settings, Task, TimerSnapshot } from '../shared/types'
import { t } from './i18n'
import { formatMs } from './features/focus/formatMs'
import { playCompletionSound, playModeSwitchSound, startRestMusic } from './features/focus/playCompletionSound'

type Page = 'focus' | 'tasks' | 'today' | 'settings'
const labels: Record<Page, string> = t.nav
const miniMode = new URLSearchParams(window.location.search).has('mini')
const restOverlayMode = new URLSearchParams(window.location.search).has('rest')

export default function App(): React.JSX.Element {
  const [page, setPage] = useState<Page>('focus'); const [timer, setTimer] = useState<TimerSnapshot>(); const [tasks, setTasks] = useState<Task[]>([]); const [settings, setSettings] = useState<Settings>(); const [stats, setStats] = useState<DailyStats>(); const [currentTaskId, setCurrentTaskId] = useState<string>(); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const refresh = async () => { try { const [state, nextTasks, nextSettings, nextStats] = await Promise.all([window.xueke.getState(), window.xueke.tasks.list(), window.xueke.settings.get(), window.xueke.stats.today()]); setTimer(state.timer); setCurrentTaskId(state.currentTaskId); setTasks(nextTasks); setSettings(nextSettings); setStats(nextStats) } catch (e) { setError(e instanceof Error ? e.message : '读取数据失败') } }
  useEffect(() => { void refresh(); const offTick = window.xueke.onTimerTick((value) => setTimer(value)); const offError = window.xueke.onStoreError((value) => setError(value.message)); const offSound = window.xueke.onCompletionSound(playCompletionSound); return () => { offTick(); offError(); offSound() } }, [])
  const invoke = async (action: () => Promise<unknown>, successMessage?: string): Promise<boolean> => { try { await action(); await refresh(); if (successMessage) { setNotice(successMessage); window.setTimeout(() => setNotice((current) => current === successMessage ? '' : current), 2600) }; return true } catch (e) { setError(e instanceof Error ? e.message : '操作失败'); return false } }
  const task = tasks.find((item) => item.id === currentTaskId)
  if (restOverlayMode) return <RestScreen timer={timer} restSoundMode={settings?.restSoundMode ?? 'quiet'} invoke={invoke} />
  if (miniMode) return <MiniFocus timer={timer} task={task} />
  return <main className="app-shell"><aside><div className="brand">{t.appName}</div><nav aria-label="主导航">{(Object.keys(labels) as Page[]).map((key) => <button className={page === key ? 'active' : ''} key={key} onClick={() => setPage(key)} type="button">{labels[key]}</button>)}</nav></aside><section className="content">{error && <p className="error">{error}<button onClick={() => void refresh()}>重试</button><button onClick={() => setError('')}>×</button></p>}{notice && <p className="notice" role="status">{notice}</p>}{page === 'focus' && timer && <Focus timer={timer} task={task} longBreakInterval={settings?.longBreakInterval ?? 4} invoke={invoke} />}{page === 'tasks' && <Tasks tasks={tasks} currentTaskId={currentTaskId} invoke={invoke} />}{page === 'today' && <Today stats={stats} />}{page === 'settings' && settings && <SettingsPage settings={settings} invoke={invoke} />}</section>{timer && timer.status !== 'idle' && <button className="global-mini-button" title={t.timer.mini} aria-label={t.timer.mini} onClick={() => void window.xueke.window.showMini()} type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h5" /></svg><span>{t.timer.mini}</span></button>}</main>
}

function Focus({ timer, task, longBreakInterval, invoke }: { timer: TimerSnapshot; task?: Task; longBreakInterval: number; invoke: (fn: () => Promise<unknown>, successMessage?: string) => Promise<boolean> }) {
  const phase = { focus: '专注', shortBreak: '短休', longBreak: '长休' }[timer.phase]
  const cycleProgress = t.timer.cycleProgress.replace('{completed}', String(timer.completedFocusCountInCycle)).replace('{interval}', String(longBreakInterval))
  const taskLabel = task ? t.timer.currentTask.replace('{title}', task.title) : t.timer.noTask
  const message = timer.status === 'idle' ? t.timer.ready : timer.status === 'paused' ? t.timer.paused : t.timer.running
  const percent = timer.plannedMs ? Math.max(0, Math.min(100, (1 - timer.remainingMs / timer.plannedMs) * 100)) : 0
  const primaryAction = timer.status === 'idle' ? { label: `${t.timer.start}${phase}`, run: () => window.xueke.timer.start() } : timer.status === 'running' ? { label: t.timer.pause, run: () => Promise.resolve(window.xueke.timer.pause()) } : { label: t.timer.resume, run: () => Promise.resolve(window.xueke.timer.resume()) }
  return <section className={`focus-stage ${timer.phase}`} aria-label={`${phase}计时器`}><div className="focus-context"><span className="focus-status">{timer.status === 'running' ? '进行中' : timer.status === 'paused' ? '已暂停' : '准备开始'}</span><p>{taskLabel}</p></div><div className="timer-orbit"><svg viewBox="0 0 120 120" aria-hidden="true"><circle className="timer-track" cx="60" cy="60" r="54" /><circle className="timer-progress" cx="60" cy="60" r="54" pathLength="100" style={{ strokeDasharray: 100, strokeDashoffset: 100 - percent }} /></svg><div className="timer-reading"><span>{phase}</span><strong>{formatMs(timer.remainingMs)}</strong><small>{cycleProgress}</small></div></div><p className="focus-message">{message}</p><div className="focus-actions"><button className="button-primary" onClick={() => void invoke(primaryAction.run, t.feedback.timerUpdated)}>{primaryAction.label}</button>{timer.status !== 'idle' && <button className="button-quiet" onClick={() => void invoke(() => window.xueke.timer.skip(), t.feedback.timerUpdated)}>{t.timer.skip}</button>}</div></section>
}

function MiniFocus({ timer, task }: { timer?: TimerSnapshot; task?: Task }): React.JSX.Element {
  const phase = timer ? { focus: '专注', shortBreak: '短休', longBreak: '长休' }[timer.phase] : '专注'
  const action = timer?.status === 'running' ? () => window.xueke.timer.pause() : timer?.status === 'paused' ? () => window.xueke.timer.resume() : () => window.xueke.timer.start()
  const actionLabel = timer?.status === 'running' ? t.timer.pause : timer?.status === 'paused' ? t.timer.resume : `${t.timer.start}${phase}`
  return <main className="mini-shell"><div className="mini-drag"><span>{phase}</span><small>{task?.title ?? t.timer.noTask}</small></div><strong>{timer ? formatMs(timer.remainingMs) : '--:--'}</strong><div className="mini-actions"><button onClick={() => void action()} type="button">{actionLabel}</button><button onClick={() => void window.xueke.window.showMain()} type="button">{t.timer.expand}</button></div></main>
}
function RestScreen({ timer, restSoundMode, invoke }: { timer?: TimerSnapshot; restSoundMode: Settings['restSoundMode']; invoke: (fn: () => Promise<unknown>, successMessage?: string) => Promise<boolean> }): React.JSX.Element {
  useEffect(() => {
    if (timer?.phase === 'focus' || timer?.status !== 'running' || restSoundMode !== 'music') return undefined
    let cleanup: (() => void) | undefined
    let cancelled = false
    void window.xueke.media.restMusicUrl().then((url) => { if (!cancelled) cleanup = startRestMusic(url) })
    return () => { cancelled = true; cleanup?.() }
  }, [timer?.phase, timer?.status, restSoundMode])
  if (!timer) return <main className="rest-screen" />
  const longBreak = timer.phase === 'longBreak'
  const title = longBreak ? t.rest.longTitle : t.rest.shortTitle
  const hint = timer.status === 'paused' ? t.rest.paused : longBreak ? t.rest.longHint : t.rest.shortHint
  const primary = timer.status === 'paused' ? () => window.xueke.timer.resume() : () => window.xueke.timer.pause()
  const primaryLabel = timer.status === 'paused' ? t.rest.continue : t.timer.pause
  return <main className={`rest-screen ${timer.phase}`} aria-label={title}><section className="rest-card"><span className="rest-orb" aria-hidden="true" /><p>{title}</p><strong>{formatMs(timer.remainingMs)}</strong><small>{hint}</small><div><button className="button-primary" onClick={() => void invoke(primary, t.feedback.timerUpdated)}>{primaryLabel}</button><button className="button-quiet" onClick={() => void invoke(() => window.xueke.timer.skip(), t.feedback.timerUpdated)}>{t.rest.skip}</button></div></section></main>
}
function Tasks({ tasks, currentTaskId, invoke }: { tasks: Task[]; currentTaskId?: string; invoke: (fn: () => Promise<unknown>, successMessage?: string) => Promise<boolean> }) {
  const [title, setTitle] = useState(''); const [note, setNote] = useState(''); const [editing, setEditing] = useState<Task>()
  const reset = () => { setTitle(''); setNote(''); setEditing(undefined) }
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!title.trim()) return; const successMessage = editing ? t.feedback.taskUpdated : t.feedback.taskCreated; void invoke(async () => { if (editing) await window.xueke.tasks.update(editing.id, { title, note }); else await window.xueke.tasks.create({ title, note }) }, successMessage).then((saved) => { if (saved) reset() }) }
  const startEdit = (task: Task) => { setEditing(task); setTitle(task.title); setNote(task.note ?? '') }
  return <><h1>{t.nav.tasks}</h1><form className="task-editor" onSubmit={submit}><label>{t.task.title}<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：完成英语阅读" /></label><label>{t.task.note}<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></label><div className="actions"><button>{editing ? t.task.save : t.task.create}</button>{editing && <button className="secondary" onClick={reset} type="button">{t.task.cancel}</button>}</div></form>{currentTaskId && <button className="unbind" onClick={() => void invoke(() => window.xueke.tasks.setCurrent(), t.feedback.currentTaskCleared)}>{t.task.unbind}</button>}<div className="list">{tasks.length === 0 && <p>{t.task.empty}</p>}{tasks.map((task) => <article className="task" key={task.id}><div><b>{task.title}</b>{task.note && <small>{task.note}</small>}<small>{task.status === 'completed' ? '已完成' : '进行中'}</small></div><div className="row"><button className={task.id === currentTaskId ? 'selected' : ''} onClick={() => void invoke(() => window.xueke.tasks.setCurrent(task.id), t.feedback.currentTaskSet)}>{task.id === currentTaskId ? '当前任务' : '设为当前'}</button><button onClick={() => startEdit(task)}>{t.task.edit}</button><button onClick={() => void invoke(() => window.xueke.tasks.update(task.id, { status: task.status === 'active' ? 'completed' : 'active' }), t.feedback.taskUpdated)}>{task.status === 'active' ? '完成' : '恢复'}</button><button className="danger" onClick={() => void invoke(() => window.xueke.tasks.delete(task.id), t.feedback.taskDeleted)}>删除</button></div></article>)}</div></>
}
function Today({ stats }: { stats?: DailyStats }) { return <><h1>{t.nav.today}</h1><div className="stats"><div><b>{stats?.completedFocusCount ?? 0}</b><span>{t.today.completed}</span></div><div><b>{Math.round((stats?.focusMs ?? 0) / 60_000)}</b><span>{t.today.minutes}</span></div></div><div className="list">{stats?.byTask.length ? stats.byTask.map((item) => <article className="task" key={item.taskId ?? 'none'}><b>{item.title}</b><span>{t.today.summary.replace('{count}', String(item.completedFocusCount)).replace('{minutes}', String(Math.round(item.focusMs / 60_000)))}</span></article>) : <p>{t.today.empty}</p>}</div></> }
const presetFields = (preset: Pick<FocusPreset, 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'longBreakInterval'>) => ({
  focusMinutes: preset.focusMinutes,
  shortBreakMinutes: preset.shortBreakMinutes,
  longBreakMinutes: preset.longBreakMinutes,
  longBreakInterval: preset.longBreakInterval,
})

function SettingsPage({ settings, invoke }: { settings: Settings; invoke: (fn: () => Promise<unknown>, successMessage?: string) => Promise<boolean> }) {
  const [form, setForm] = useState(settings); const [presets, setPresets] = useState<FocusPreset[]>([]); const [presetName, setPresetName] = useState(''); const [editingPreset, setEditingPreset] = useState<FocusPreset>()
  const builtInPresets: FocusPreset[] = [
    { id: 'deep-work', name: t.settings.deepWork, focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 30, longBreakInterval: 3 },
    { id: 'development', name: t.settings.development, focusMinutes: 40, shortBreakMinutes: 8, longBreakMinutes: 25, longBreakInterval: 4 },
    { id: 'learning', name: t.settings.learning, focusMinutes: 30, shortBreakMinutes: 5, longBreakMinutes: 20, longBreakInterval: 4 },
    { id: 'writing', name: t.settings.writing, focusMinutes: 35, shortBreakMinutes: 7, longBreakMinutes: 25, longBreakInterval: 3 },
    { id: 'errands', name: t.settings.errands, focusMinutes: 20, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakInterval: 3 },
    { id: 'low-energy', name: t.settings.lowEnergy, focusMinutes: 15, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakInterval: 3 },
  ]
  const loadPresets = async () => setPresets(await window.xueke.focusPresets.list())
  useEffect(() => { setForm(settings) }, [settings]); useEffect(() => { void loadPresets() }, [])
  const field = (key: keyof Settings, label: string) => <label>{label}<input type="number" min="1" value={form[key] as number} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} /></label>
  const applyPreset = (preset: FocusPreset) => void invoke(() => window.xueke.settings.update(presetFields(preset)), t.feedback.presetApplied)
  const resetPresetEditor = () => { setPresetName(''); setEditingPreset(undefined) }
  const savePreset = () => { if (!presetName.trim()) return; const input = { name: presetName, ...presetFields(form) }; const successMessage = editingPreset ? t.feedback.presetUpdated : t.feedback.presetCreated; void (async () => { const saved = await invoke(() => editingPreset ? window.xueke.focusPresets.update(editingPreset.id, input) : window.xueke.focusPresets.create(input), successMessage); if (saved) { resetPresetEditor(); await loadPresets() } })() }
  const beginEdit = (preset: FocusPreset) => { setEditingPreset(preset); setPresetName(preset.name); setForm({ ...form, ...presetFields(preset) }) }
  const removePreset = (id: string) => void (async () => { if (await invoke(() => window.xueke.focusPresets.delete(id), t.feedback.presetDeleted)) await loadPresets() })()
  const summary = (preset: FocusPreset) => t.settings.presetSummary.replace('{focus}', String(preset.focusMinutes)).replace('{shortBreak}', String(preset.shortBreakMinutes)).replace('{longBreak}', String(preset.longBreakMinutes)).replace('{interval}', String(preset.longBreakInterval))
  const matchesCurrentSettings = (preset: FocusPreset) => Object.entries(presetFields(preset)).every(([key, value]) => settings[key as keyof Pick<Settings, 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'longBreakInterval'>] === value)
  const renderPreset = (preset: FocusPreset, custom = false) => { const current = matchesCurrentSettings(preset); return <article className={`preset ${current ? 'current' : ''}`} key={preset.id}><div><b>{preset.name}{current && <em>{t.settings.current}</em>}</b><span>{summary(preset)}</span></div><div className="row">{current ? <span className="applied-mark">✓ {t.settings.current}</span> : <button onClick={() => applyPreset(preset)} type="button">{t.settings.apply}</button>}{custom && <><button onClick={() => beginEdit(preset)} type="button">{t.settings.edit}</button><button className="danger" onClick={() => removePreset(preset.id)} type="button">{t.settings.delete}</button></>}</div></article> }
  return <><h1>{t.settings.title}</h1><section className="preset-section"><h2>{t.settings.presets}</h2><p className="preset-hint">{t.settings.presetsHint}</p><h3>{t.settings.builtin}</h3><div className="preset-list">{builtInPresets.map((preset) => renderPreset(preset))}</div><h3>{t.settings.mine}</h3><div className="preset-list">{presets.length ? presets.map((preset) => renderPreset(preset, true)) : <p>{t.settings.noPresets}</p>}</div><div className="preset-editor"><label>{t.settings.presetName}<input value={presetName} maxLength={50} onChange={(e) => setPresetName(e.target.value)} placeholder="例如：晚间学习" /></label><div className="row"><button onClick={savePreset} type="button">{editingPreset ? t.settings.updatePreset : t.settings.savePreset}</button>{editingPreset && <button onClick={resetPresetEditor} type="button">{t.settings.cancelEdit}</button>}</div></div></section><form className="settings" onSubmit={(e) => { e.preventDefault(); void invoke(() => window.xueke.settings.update(form), t.feedback.settingsSaved) }}>{field('focusMinutes', t.settings.focus)}{field('shortBreakMinutes', t.settings.shortBreak)}{field('longBreakMinutes', t.settings.longBreak)}{field('longBreakInterval', t.settings.interval)}<label>{t.settings.restSound}<select value={form.restSoundMode} onChange={(e) => { setForm({ ...form, restSoundMode: e.target.value as Settings['restSoundMode'] }); playModeSwitchSound() }}><option value="quiet">{t.settings.quiet}</option><option value="music">{t.settings.music}</option></select></label><label className="check"><input type="checkbox" checked={form.notificationEnabled} onChange={(e) => setForm({ ...form, notificationEnabled: e.target.checked })} />{t.settings.notification}</label><label className="check"><input type="checkbox" checked={form.soundEnabled} onChange={(e) => setForm({ ...form, soundEnabled: e.target.checked })} />{t.settings.sound}</label><button>{t.settings.save}</button></form></>
}
