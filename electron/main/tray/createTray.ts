import { Menu, Tray, app, nativeImage } from 'electron'
import type { SessionService } from '../services/sessionService'

const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1WQAAAABJRU5ErkJggg==')

export function createTray(service: SessionService, showWindow: () => void): Tray {
  const tray = new Tray(icon)
  const refresh = () => {
    const timer = service.snapshot(); const totalSeconds = Math.ceil(timer.remainingMs / 1000)
    const remaining = `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`
    tray.setToolTip(`学刻 · ${timer.status === 'idle' ? '准备开始' : remaining}`)
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: `剩余时间：${remaining}`, enabled: false },
      { label: '开始', enabled: timer.status === 'idle', click: () => void service.start() },
      { label: '暂停', enabled: timer.status === 'running', click: () => service.pause() },
      { label: '继续', enabled: timer.status === 'paused', click: () => service.resume() },
      { label: '跳过', enabled: timer.status !== 'idle', click: () => void service.skip() },
      { type: 'separator' },
      { label: '显示学刻', click: showWindow },
      { label: '退出', click: () => app.quit() },
    ]))
  }
  service.on('tick', refresh); refresh(); tray.on('click', showWindow)
  return tray
}
