import { app, BrowserWindow, screen, Tray } from 'electron'
import { join } from 'node:path'
import { electronApp, is } from '@electron-toolkit/utils'
import { registerIpc } from './ipc/registerIpc'
import { SessionService } from './services/sessionService'
import { AppStore } from './store/appStore'
import { getAppDataFilePath } from './store/paths'
import { createTray } from './tray/createTray'

let service: SessionService
let tray: Tray
let mainWindow: BrowserWindow | undefined
let miniWindow: BrowserWindow | undefined
let restWindow: BrowserWindow | undefined

function loadRenderer(window: BrowserWindow, mode: 'main' | 'mini' | 'rest' = 'main'): void {
  const query = mode === 'main' ? '' : `?${mode}=1`
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(`${process.env.ELECTRON_RENDERER_URL}${query}`)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'), mode === 'main' ? undefined : { query: { [mode]: '1' } })
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
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

  mainWindow.on('ready-to-show', () => { mainWindow?.show(); const notice = service?.consumeRecoveryNotice(); if (notice) mainWindow?.webContents.send('xueke:store:error', { message: notice }) })
  mainWindow.on('closed', () => { mainWindow = undefined })
  loadRenderer(mainWindow)
}

function showMiniWindow(): void {
  if (!miniWindow) {
    miniWindow = new BrowserWindow({
      width: 360,
      height: 164,
      minWidth: 300,
      minHeight: 150,
      maxWidth: 460,
      maxHeight: 220,
      show: false,
      alwaysOnTop: true,
      frame: false,
      transparent: true,
      resizable: true,
      skipTaskbar: true,
      webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
    })
    miniWindow.setAlwaysOnTop(true, 'floating')
    miniWindow.on('closed', () => { miniWindow = undefined })
    miniWindow.on('ready-to-show', () => miniWindow?.showInactive())
    loadRenderer(miniWindow, 'mini')
  } else miniWindow.showInactive()
  mainWindow?.hide()
}

function showMainWindow(): void {
  miniWindow?.hide()
  if (!mainWindow) createWindow()
  mainWindow?.show(); mainWindow?.focus()
}

function showRestOverlay(): void {
  if (!restWindow) {
    const { x, y, width, height } = screen.getPrimaryDisplay().bounds
    restWindow = new BrowserWindow({
      x, y, width, height,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
    })
    restWindow.setAlwaysOnTop(true, 'screen-saver')
    restWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    restWindow.on('closed', () => { restWindow = undefined })
    loadRenderer(restWindow, 'rest')
  }
  restWindow.show(); restWindow.focus()
}

function hideRestOverlay(): void {
  restWindow?.hide()
}

function playCompletionSound(phase: 'focus' | 'shortBreak' | 'longBreak'): void {
  const target = mainWindow ?? miniWindow
  target?.webContents.send('xueke:completion:sound', phase)
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.xueke.app')
  service = new SessionService(new AppStore(getAppDataFilePath(app.getPath('userData'))))
  await service.initialize()
  service.on('tick', (snapshot) => {
    if (snapshot.phase !== 'focus' && snapshot.status !== 'idle') showRestOverlay()
    else hideRestOverlay()
  })
  registerIpc(service, { showMini: showMiniWindow, showMain: showMainWindow, playCompletionSound })
  createWindow()
  tray = createTray(service, showMainWindow)

  app.on('activate', () => {
    if (!mainWindow) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => { tray?.destroy(); service?.dispose() })
