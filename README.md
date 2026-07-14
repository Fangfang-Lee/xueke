# 学刻（xueke）

面向学习场景的 **PC 端番茄工作法客户端**：选任务 → 专注 → 休息 → 看今日统计，数据仅保存在本地。

> 当前仓库处于早期阶段，应用骨架与功能开发中。开发约定见 [`agent.md`](./agent.md)。

## 功能（规划中的 MVP）

- 经典番茄钟：专注 / 短休 / 长休，开始、暂停、继续、跳过
- 可配置时长与长休间隔
- 系统通知与提示音
- 学习任务列表，番茄可绑定当前任务
- 当日统计：完成番茄数、专注总时长、按任务汇总
- 仅本地存储，无账号、无云同步

## 技术栈

| 层 | 选型 |
|---|---|
| 桌面壳 | Electron |
| UI | React + TypeScript |
| 构建 | Vite |
| 平台 | macOS、Windows |

## 环境要求

- **Node.js** ≥ 20（见 `.nvmrc`）
- npm / pnpm / yarn 任一即可（推荐与团队统一一种）

## 开发

```bash
# 安装依赖（脚手架就绪后）
npm install

# 启动开发（脚本将随脚手架补充）
npm run dev

# 类型检查 / 构建 / 打包（脚本将随脚手架补充）
npm run typecheck
npm run build
npm run package
```

> `package.json` 中的脚本目前为占位；搭好 Electron + React 工程后会补全。

## 文档

- [`agent.md`](./agent.md) — 产品与工程硬约束（给协作者 / Agent 用）
- [`docs/plans/`](./docs/plans/) — 设计记录

## 许可证

[MIT](./LICENSE)
