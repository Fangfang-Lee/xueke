# 学刻（xueke）

面向学习场景的 **PC 端番茄工作法客户端**：选任务 → 专注 → 休息 → 看今日统计，数据仅保存在本地。

> 当前版本可在 macOS 上以 Electron 桌面客户端方式运行。所有学习数据仅保存在本机。

## 已实现功能

- 经典番茄钟：专注 / 短休 / 长休，开始、暂停、继续、跳过
- 可配置专注、短休、长休时长，以及长休间隔
- 主进程权威计时：窗口失焦或最小化时仍按实际时间倒计时
- 系统通知、系统提示音与菜单栏托盘快捷控制
- 学习任务新建、编辑标题/备注、完成、删除、设为当前任务或取消绑定
- 当日统计：完成番茄数、专注总时长、按任务汇总
- 本地 JSON 持久化：重启后保留任务、设置和历史会话；未完成会话会标记为中断
- 仅本地存储，无账号、无云同步

长休默认在完成 4 次专注后触发；可在“设置”中调整。只有自然完成的专注会计入长休间隔和今日统计，跳过或中断的会话不计入。

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
# 安装依赖
npm install

# 启动桌面端开发环境
npm run dev

# 仅在浏览器中预览界面（不含 Electron 的通知、托盘、计时等桌面能力）
npm run dev:web

# 运行自动化测试、类型检查和构建
npm test
npm run typecheck
npm run build

# 生成安装包（macOS: DMG；Windows: NSIS）
npm run package
```

首次运行前请确保 Node.js 版本不低于 20。

## 打包说明

项目已包含 macOS DMG 与 Windows NSIS 的打包配置。macOS 已完成开发运行验证；Windows 安装包仍需在 Windows 环境或 CI 中实际构建与验证。若 `npm run package` 在外部下载/签名环节停滞，请检查网络访问与本机代码签名环境。

## 下载与安装

请从 [GitHub Releases](https://github.com/Fangfang-Lee/xueke/releases/latest) 下载最新版本：

- **Mac（Apple Silicon）**：下载文件名包含 `mac-arm64` 的 `.dmg`，适用于 M1、M2、M3、M4 芯片。
- **Windows（x64）**：下载文件名包含 `win-x64` 的 `.exe` 安装程序。

macOS 首次打开未签名应用时，如系统阻止启动，可在“系统设置 → 隐私与安全性”中选择仍要打开。Windows 安装完成后，可从开始菜单启动“学刻”。

## 发布流程

每次发布时创建并推送版本标签即可触发 GitHub Actions，自动构建 macOS Apple Silicon DMG 与 Windows x64 安装包，并上传至 Release：

```bash
git tag -a v0.1.5 -m "学刻 v0.1.5"
git push origin v0.1.5
```

## 文档

- [`docs/plans/`](./docs/plans/) — 设计记录

## 许可证

[MIT](./LICENSE)
