# 学刻 MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 交付可在 macOS / Windows 离线运行的学刻 MVP：主进程权威计时 + 任务绑定 + 当日统计 + 本地持久化，完成「选任务 → 专注 → 休息 → 看今日」闭环。

**Architecture:** electron-vite 分离主进程 / preload / 渲染进程。计时与 JSON 持久化在主进程；渲染层只经 `contextBridge` IPC 读写。领域逻辑（计时引擎、统计聚合、store 读写）放在可单测模块中，用 Vitest 覆盖后再接 Electron。

**Tech Stack:** Electron、React 18+、TypeScript（strict）、electron-vite、Vitest、本地 JSON（`userData`）、简版 i18n（仅 `zh-CN` 文案）。

**Constraints source:** @agent.md  
**Design ref:** @docs/plans/2026-07-14-xueke-pomodoro-design.md

**Out of scope (do not implement):** 账号/云同步、网站拦截、Linux 包、英文 UI、SQLite（首版锁定 JSON）。

---

## 前提（执行前人工完成）

1. Node ≥ 20（`.nvmrc` 为 `20`）。本机若仍为 16，先：`nvm install 20 && nvm use`
2. 确认 `agent.md` 未改动范围后再开干

---

### Task 1: 脚手架（electron-vite + React + TS）

**Files:**
- Create/overwrite via scaffold: `electron/`, `src/`, `electron.vite.config.ts`, `tsconfig*.json`, `index.html`
- Modify: `package.json`（保留 name/productName/repository/engines/license，替换 scripts 与依赖）
- Modify: `README.md`（补真实 `dev`/`build` 命令）
- Modify: `.gitignore`（若脚手架生成冲突条目则合并，勿丢现有规则）

**Step 1: 在仓库根目录初始化 electron-vite React-TS 模板**

优先在**临时目录**生成再合并，避免冲掉 `agent.md` / `docs/`：

```bash
cd /tmp
npm create @quick-start/electron@latest xueke-scaffold -- --template react-ts
# 按提示：项目名随意；选择 TypeScript + React
```

若 CLI 交互失败，改用官方文档等价非交互命令，或以 electron-vite 文档手工建同构目录。

**Step 2: 合并进本仓库**

- 复制 `electron/`、`src/`、配置文件、依赖声明到 `/Users/jason/cursor/xueke`
- **保留**已有：`agent.md`、`docs/`、`LICENSE`、`.nvmrc`、`README.md`（合并内容）
- `package.json` 字段以学刻为准：
  - `"name": "xueke"`
  - `"productName": "学刻"`
  - `"engines": { "node": ">=20" }`
  - repository / author / license 保持现有

**Step 3: 安装并验证空窗可跑**

```bash
cd /Users/jason/cursor/xueke
nvm use   # 或确保 node -v >= 20
npm install
npm run dev
```

Expected: Electron 窗口打开，默认 React 页可见；控制台无 `contextIsolation` 相关警告回退。

**Step 4: 对齐目录到 agent.md**

目标结构（可在脚手架基础上微调命名，但职责须一致）：

```text
electron/
  main/           # 主进程入口、窗口、IPC、计时、store、tray、notify
  preload/        # contextBridge
src/
  features/
    focus/
    tasks/
    today/
    settings/
  i18n/
  shared/         # 若渲染侧需要，可从 electron 旁的共享包引用；优先单一 shared 源
shared/           # 推荐：主/渲染共用类型与 IPC channel 常量（被两边 import）
  types.ts
  ipc.ts
  defaults.ts
```

若 electron-vite 默认把共享放在 `src/shared`，则主进程通过配置 alias 引用同一目录；**禁止复制两份类型定义**。

**Step 5: 安全基线检查**

打开主进程 `BrowserWindow` 配置，确认：

```ts
webPreferences: {
  preload: path.join(...),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true // 若与现有 preload 冲突可暂 false，但不得开 nodeIntegration
}
```

**Step 6: 加 Vitest**

```bash
npm install -D vitest
```

`package.json` 增加：

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

`vitest.config.ts` 覆盖 `shared/**` 与 `electron/main/**/*.test.ts`（纯逻辑，不启 Electron）。

**Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: scaffold electron-vite React TypeScript app

Wire Electron main/preload/renderer toolchain while preserving agent docs and repo metadata.
EOF
)"
```

---

### Task 2: 共享类型、默认设置与 IPC 契约

**Files:**
- Create: `shared/types.ts`
- Create: `shared/defaults.ts`
- Create: `shared/ipc.ts`
- Create: `shared/types.test.ts`（可选冒烟：默认值形状）

**Step 1: 写入类型（与 agent.md §6 对齐）**

```ts
// shared/types.ts
export type TaskStatus = 'active' | 'completed'

export interface Task {
  id: string
  title: string
  note?: string
  status: TaskStatus
  createdAt: string // ISO
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
  locale: 'zh-CN'
}

export type TimerPhase = SessionType

export type TimerStatus = 'idle' | 'running' | 'paused'

export interface TimerSnapshot {
  status: TimerStatus
  phase: TimerPhase
  remainingMs: number
  plannedMs: number
  startedAt?: string
  completedFocusCountInCycle: number // 本轮已完成专注数，用于长休判定
  currentTaskId?: string
  activeSessionId?: string
}

export interface DailyStats {
  date: string // YYYY-MM-DD local
  completedFocusCount: number
  focusMs: number
  byTask: Array<{ taskId: string | null; title: string; completedFocusCount: number; focusMs: number }>
}

export interface AppData {
  version: 1
  tasks: Task[]
  sessions: PomodoroSession[]
  settings: Settings
  currentTaskId?: string
}
```

**Step 2: 默认值**

```ts
// shared/defaults.ts
import type { Settings, AppData } from './types'

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
```

**Step 3: IPC channel 白名单**

```ts
// shared/ipc.ts
export const IpcChannels = {
  // invoke (renderer -> main)
  getState: 'xueke:getState',
  timerStart: 'xueke:timer:start',
  timerPause: 'xueke:timer:pause',
  timerResume: 'xueke:timer:resume',
  timerSkip: 'xueke:timer:skip',
  tasksList: 'xueke:tasks:list',
  tasksCreate: 'xueke:tasks:create',
  tasksUpdate: 'xueke:tasks:update',
  tasksDelete: 'xueke:tasks:delete',
  tasksSetCurrent: 'xueke:tasks:setCurrent',
  settingsGet: 'xueke:settings:get',
  settingsUpdate: 'xueke:settings:update',
  statsToday: 'xueke:stats:today',
  // events (main -> renderer)
  timerTick: 'xueke:timer:tick',
  timerPhaseEnded: 'xueke:timer:phaseEnded',
  dataChanged: 'xueke:data:changed',
  storeError: 'xueke:store:error',
} as const
```

**Step 4: Commit**

```bash
git add shared/
git commit -m "feat: add shared types, defaults, and IPC channel contracts"
```

---

### Task 3: JSON 持久化（纯逻辑 + 文件适配）

**Files:**
- Create: `electron/main/store/appStore.ts`
- Create: `electron/main/store/paths.ts`
- Create: `electron/main/store/appStore.test.ts`
- Create: `electron/main/stats/dailyStats.ts`
- Create: `electron/main/stats/dailyStats.test.ts`

**Step 1: 写失败测试 — 统计口径**

```ts
// electron/main/stats/dailyStats.test.ts
import { describe, it, expect } from 'vitest'
import { computeDailyStats } from './dailyStats'
import type { PomodoroSession, Task } from '../../../shared/types'

describe('computeDailyStats', () => {
  it('counts only completed focus sessions for the local day', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: '英语',
        status: 'active',
        createdAt: '2026-07-14T00:00:00.000Z',
      },
    ]
    const sessions: PomodoroSession[] = [
      {
        id: 's1',
        taskId: 't1',
        type: 'focus',
        plannedMs: 25 * 60_000,
        startedAt: '2026-07-14T01:00:00.000Z',
        endedAt: '2026-07-14T01:25:00.000Z',
        completed: true,
      },
      {
        id: 's2',
        taskId: 't1',
        type: 'focus',
        plannedMs: 25 * 60_000,
        startedAt: '2026-07-14T02:00:00.000Z',
        endedAt: '2026-07-14T02:10:00.000Z',
        completed: false, // skipped
      },
      {
        id: 's3',
        type: 'shortBreak',
        plannedMs: 5 * 60_000,
        startedAt: '2026-07-14T01:25:00.000Z',
        endedAt: '2026-07-14T01:30:00.000Z',
        completed: true,
      },
    ]
    const stats = computeDailyStats(sessions, tasks, '2026-07-14', 'UTC')
    expect(stats.completedFocusCount).toBe(1)
    expect(stats.focusMs).toBe(25 * 60_000)
    expect(stats.byTask[0]).toMatchObject({ taskId: 't1', completedFocusCount: 1 })
  })
})
```

（时区：实现时用传入的 `timeZone` 或固定用系统本地；测试里用固定 `UTC`/`Asia/Shanghai` 避免漂移。）

**Step 2: 跑测试确认失败**

```bash
npm test -- electron/main/stats/dailyStats.test.ts
```

Expected: FAIL — `computeDailyStats` 未定义

**Step 3: 实现 `computeDailyStats`**

规则（agent.md）：

- 完成番茄 = `type === 'focus' && completed === true`
- `focusMs` 用该会话 `endedAt - startedAt`（或 `plannedMs` 若你选择「完成即满额」——**采用实际时长**，跳过用未完成不计入）
- 按本地日过滤 `startedAt`

**Step 4: 跑测试到通过**

**Step 5: 写 store 测试（内存 fs）**

用临时目录：

```ts
// 伪代码要点
it('loads defaults when file missing', ...)
it('roundtrips tasks and settings', ...)
it('rejects corrupt json and surfaces error result', ...)
```

Store API 建议：

```ts
export class AppStore {
  constructor(private readonly filePath: string) {}
  async load(): Promise<AppData>
  async save(data: AppData): Promise<void>
  // 或 get/update 细粒度方法，内部读写同一 JSON
}
```

持久化路径：`path.join(app.getPath('userData'), 'xueke-data.json')` — `paths.ts` 在 Node 单测里注入自定义路径，不在测试里调真实 `app`。

**Step 6: 实现并测通 store**

读写失败：`load/save` 抛错或返回 `Result`；主进程稍后通过 `storeError` 事件通知 UI（Task 6）。

**Step 7: Commit**

```bash
git add electron/main/store electron/main/stats
git commit -m "feat: add JSON app store and daily stats aggregation"
```

---

### Task 4: 主进程番茄计时引擎（权威源）

**Files:**
- Create: `electron/main/timer/pomodoroTimer.ts`
- Create: `electron/main/timer/pomodoroTimer.test.ts`

**Step 1: 写失败测试 — 倒计时与完成**

使用可注入 `now(): number` 与可控 tick（**不要**在单测里真等 25 分钟）：

```ts
it('starts focus with planned duration from settings', () => {
  const timer = new PomodoroTimer({ now: () => 1_000, settings: DEFAULT_SETTINGS })
  timer.start('focus', { taskId: 't1' })
  expect(timer.snapshot().status).toBe('running')
  expect(timer.snapshot().remainingMs).toBe(25 * 60_000)
})

it('reaches zero and emits phaseComplete', () => {
  let t = 0
  const timer = new PomodoroTimer({ now: () => t, settings: DEFAULT_SETTINGS })
  const ended: string[] = []
  timer.on('phaseComplete', (e) => ended.push(e.phase))
  timer.start('focus')
  t += 25 * 60_000
  timer.tick()
  expect(timer.snapshot().remainingMs).toBe(0)
  expect(ended).toEqual(['focus'])
})

it('pause freezes remaining; resume continues', () => { /* ... */ })

it('skip marks incomplete and advances policy', () => { /* ... */ })

it('after N completed focuses, next break is longBreak', () => {
  // longBreakInterval = 4
})
```

**剩余时间计算：** `remainingMs = max(0, endsAt - now())`，其中 `endsAt` 在 start/resume 时写入；**禁止**仅靠累加 tick 次数（避免漂移）。主进程可用 `setInterval(250ms)` 调 `tick()` 仅作唤醒，真正剩余看墙钟。

**Step 2: 跑测失败 → 实现 `PomodoroTimer` → 跑通**

**Step 3: Commit**

```bash
git add electron/main/timer
git commit -m "feat: add main-process pomodoro timer engine"
```

---

### Task 5: 主进程组装 — IPC、会话落盘、启动恢复

**Files:**
- Create: `electron/main/services/sessionService.ts`
- Create: `electron/main/ipc/registerIpc.ts`
- Modify: `electron/main/index.ts`（或脚手架入口）
- Modify: `electron/preload/index.ts`

**Step 1: 定义 preload API**

```ts
// preload 暴露形状（渲染侧 window.xueke）
export interface XuekeApi {
  getState: () => Promise<{ timer: TimerSnapshot; currentTaskId?: string }>
  timer: {
    start: () => Promise<TimerSnapshot>
    pause: () => Promise<TimerSnapshot>
    resume: () => Promise<TimerSnapshot>
    skip: () => Promise<TimerSnapshot>
  }
  tasks: { list; create; update; delete; setCurrent }
  settings: { get; update }
  stats: { today: () => Promise<DailyStats> }
  onTimerTick: (cb: (s: TimerSnapshot) => void) => () => void
  onPhaseEnded: (cb: (p: { phase: TimerPhase; completed: boolean }) => void) => () => void
  onStoreError: (cb: (e: { message: string }) => void) => () => void
}
```

`contextBridge.exposeInMainWorld('xueke', api)`；channel 只用 `shared/ipc.ts` 常量。

**Step 2: 注册 IPC handlers**

每个 handler：校验入参 → 调 store/timer → 返回快照。  
开始专注时创建 `PomodoroSession`（`completed: false`），phaseComplete 且非 skip 时标 `completed: true` 并 `endedAt`；skip/中断 `completed: false`。

**Step 3: 启动恢复**

若存在 `activeSessionId` / 未结束会话：标记中断（`completed: false`, `endedAt: now`）并 timer 置 `idle`（MVP 不做复杂断点续跑，与 agent「标记中断」一致）。

**Step 4: 手测**

```bash
npm run dev
```

DevTools Console：`await window.xueke.timer.start()` 应返回 running；最小化窗口后剩余时间仍连续减少（过 10s 对照墙钟）。

**Step 5: Commit**

```bash
git add electron/main electron/preload shared
git commit -m "feat: wire IPC preload API and session persistence"
```

---

### Task 6: i18n（仅 zh-CN）+ 应用壳导航

**Files:**
- Create: `src/i18n/zh-CN.ts`
- Create: `src/i18n/index.ts`
- Create: `src/app/App.tsx`
- Create: `src/app/Nav.tsx`
- Modify: `src/main.tsx`

**Step 1: 文案字典**

```ts
export const zhCN = {
  appName: '学刻',
  nav: { focus: '专注台', tasks: '任务', today: '今日', settings: '设置' },
  focus: {
    start: '开始',
    pause: '暂停',
    resume: '继续',
    skip: '跳过',
    noTask: '未绑定任务',
    phase: { focus: '专注', shortBreak: '短休', longBreak: '长休' },
  },
  // tasks / today / settings ...
} as const
```

`t('focus.start')` 简单 key 访问即可；**不要**上完整 i18next，除非已有必要——YAGNI。

**Step 2: 四页占位 + 顶栏/侧栏导航**

占位组件即可，保证路由或本地 tab state 可切换。

**Step 3: Commit**

```bash
git commit -m "feat: add zh-CN i18n shell and main navigation"
```

---

### Task 7: 专注台 UI

**Files:**
- Create: `src/features/focus/FocusPage.tsx`
- Create: `src/features/focus/useTimer.ts`
- Create: `src/features/focus/formatMs.ts`
- Create: `src/features/focus/formatMs.test.ts`

**Step 1: `formatMs` 单测**（`1500` → 显示约定，如 `25:00`）

**Step 2: `useTimer`**

- mount 时 `getState` + 订阅 `onTimerTick` / `onPhaseEnded`
- 按钮调用 `window.xueke.timer.*`
- 展示阶段名、倒计时、当前任务标题（任务列表里查或 getState 带 title）

**Step 3: UI 布局保持简单**：一屏一事（阶段 + 大字倒计时 + 控制钮 + 当前任务），不做复杂仪表盘。

**Step 4: 手测完整一轮短时长**

临时把默认专注改为 0.1 分钟或在设置页（若未好，可于开发模式用设置 API）验证 phase 切换。

**Step 5: Commit**

```bash
git commit -m "feat: implement focus page bound to main-process timer"
```

---

### Task 8: 任务页

**Files:**
- Create: `src/features/tasks/TasksPage.tsx`
- Create: `src/features/tasks/TaskForm.tsx`
- Modify: IPC/store 若缺 update/delete

**Step 1: 列表、新建、编辑标题/备注、完成/删除、设为当前**

**Step 2: 手测**

- 创建任务 → 设为当前 → 专注台显示绑定  
- 重启应用任务仍在（读 `userData/xueke-data.json`）

**Step 3: Commit**

```bash
git commit -m "feat: add task list CRUD and current-task binding"
```

---

### Task 9: 今日统计页

**Files:**
- Create: `src/features/today/TodayPage.tsx`
- 复用 `computeDailyStats` via IPC `stats.today`

**Step 1: 展示完成番茄数、专注总时长、按任务汇总**

**Step 2: 手测**

- 完成 1 个 focus → 今日 +1  
- skip 一个 focus → 计数不变  

**Step 3: Commit**

```bash
git commit -m "feat: add today stats view from session aggregation"
```

---

### Task 10: 设置页

**Files:**
- Create: `src/features/settings/SettingsPage.tsx`

**Step 1: 绑定 Settings 字段**

时长、长休间隔、声音/通知开关；locale 只读显示「简体中文」。

**Step 2: 校验**

分钟数为正整数；`longBreakInterval` ≥ 1。非法输入拒绝保存并提示（i18n key）。

**Step 3: 改时长后新开会话生效**（进行中会话可 MVP 不热更新，但需在 UI 标明「下次开始后生效」）。

**Step 4: Commit**

```bash
git commit -m "feat: add settings page for durations and alerts"
```

---

### Task 11: 系统通知 + 提示音

**Files:**
- Create: `electron/main/notify/phaseNotifier.ts`
- Create: `resources/sounds/phase-end.wav`（短音效，注意许可证；或先用系统 beep 占位并在 README 注明）
- Modify: timer phaseComplete 处理

**Step 1:** `notificationEnabled` 时 `Notification` 显示阶段结束  
**Step 2:** `soundEnabled` 时播放本地音频（主进程或通知 renderer 播，二选一，保持简单）  
**Step 3:** 手测开关关闭时无通知/无声  

**Step 4: Commit**

```bash
git commit -m "feat: notify and play sound on phase end"
```

---

### Task 12: 系统托盘（渐进）

**Files:**
- Create: `electron/main/tray/createTray.ts`
- Add: `resources/trayIcon.png`（简朴单色图标）

**Step 1: 托盘菜单**

- 显示剩余时间文案（随 tick 更新 tooltip）
- 开始 / 暂停 / 继续 / 显示主窗口 / 退出

**Step 2: macOS / Windows 各手测一次路径**（Windows 可延后到有机器时，计划中记录）

**Step 3: Commit**

```bash
git commit -m "feat: add system tray with timer controls"
```

---

### Task 13: 存储错误可见性

**Files:**
- Modify: `src/app/App.tsx` 或全局 toast
- Modify: store save/load 错误 → `storeError` 事件

**Step 1:** 模拟只读目录或故意写坏路径（开发用开关），UI 显示「保存失败，请重试」+ 重试按钮  
**Step 2: Commit**

```bash
git commit -m "fix: surface store read/write errors in UI"
```

---

### Task 14: 打包 macOS / Windows 配置

**Files:**
- Modify: `electron-builder` / electron-vite 打包配置
- Modify: `package.json` scripts `package` / `build`
- Modify: `README.md`

**Step 1:** 配置 `productName: 学刻`，appId 如 `com.fangfanglee.xueke`  
**Step 2:** `npm run build` 本地产出 mac 包；Windows 可在 CI 或 Windows 机打  
**Step 3:** README 写明产物路径与 Node 版本  
**Step 4: Commit**

```bash
git commit -m "chore: configure electron packaging for macOS and Windows"
```

---

### Task 15: MVP 验收对照 agent.md §8

**Checklist（全部勾完再宣称 MVP 完成）:**

- [ ] 窗口失焦 / 最小化，计时与墙钟偏差可接受（说明若有 1s 级 UI 刷新误差）
- [ ] 重启后任务与历史会话仍在
- [ ] 完成 vs 跳过统计口径正确
- [ ] `nodeIntegration: false` + `contextIsolation: true` 未回退
- [ ] macOS 可跑；Windows 至少打过包或在真机抽检
- [ ] `npm test` 全绿
- [ ] 用户可见字符串均走 i18n key

**Step 最后: 更新 README 状态「MVP 可用」并推送（经用户明确要求再 push）**

---

## 建议提交节奏

每完成一个 Task 立刻 commit；不要攒到全部 UI 做完再提交。推送远程仅在用户要求时执行。

## 风险与决断（已预置）

| 风险 | 决断 |
|---|---|
| 渲染进程 setInterval 漂移 | 主进程墙钟 `endsAt`，渲染只展示快照 |
| SQLite vs JSON | **JSON** 文件，单文件 `xueke-data.json` |
| 断点续跑 | MVP **标记中断**，不做续跑 |
| 完整 i18n 库 | 轻量字典，仅 zh-CN |

---

## 执行方式（完成后选择）

Plan complete and saved to `docs/plans/2026-07-14-xueke-mvp-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** — 每 Task 开新子代理，Task 间复查，迭代快  

**2. Parallel Session (separate)** — 新开会话用 executing-plans，按检查点批量执行  

Which approach?
