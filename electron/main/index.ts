import { app, BrowserWindow, Tray } from 'electron'
import { join } from 'node:path'
import { electronApp, is } from '@electron-toolkit/utils'
import { registerIpc } from './ipc/registerIpc'
import { SessionService } from './services/sessionService'
import { AppStore } from './store/appStore'
import { getAppDataFilePath } from './store/paths'
import { createTray } from './tray/createTray'

let service: SessionService
let tray: Tray

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.on('ready-to-show', () => { window.show(); const notice = service?.consumeRecoveryNotice(); if (notice) window.webContents.send('xueke:store:error', { message: notice }) })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.xueke.app')
  service = new SessionService(new AppStore(getAppDataFilePath(app.getPath('userData'))))
  await service.initialize()
  registerIpc(service)
  createWindow()
  tray = createTray(service, () => { const window = BrowserWindow.getAllWindows()[0]; if (window) { window.show(); window.focus() } else createWindow() })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => { tray?.destroy(); service?.dispose() })
