import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../../shared/ipc'

/**
 * IPC API will be added here explicitly as each feature is implemented.
 * Do not expose Node.js or arbitrary Electron APIs to the renderer.
 */
contextBridge.exposeInMainWorld('xueke', {
  getState: () => ipcRenderer.invoke(IpcChannels.getState),
  timer: { start: () => ipcRenderer.invoke(IpcChannels.timerStart), pause: () => ipcRenderer.invoke(IpcChannels.timerPause), resume: () => ipcRenderer.invoke(IpcChannels.timerResume), skip: () => ipcRenderer.invoke(IpcChannels.timerSkip) },
  window: { showMini: () => ipcRenderer.invoke(IpcChannels.windowShowMini), showMain: () => ipcRenderer.invoke(IpcChannels.windowShowMain) },
  media: { restMusicUrl: () => ipcRenderer.invoke(IpcChannels.mediaRestMusicUrl) },
  tasks: { list: () => ipcRenderer.invoke(IpcChannels.tasksList), create: (input: { title: string; note?: string }) => ipcRenderer.invoke(IpcChannels.tasksCreate, input), update: (id: string, input: unknown) => ipcRenderer.invoke(IpcChannels.tasksUpdate, id, input), delete: (id: string) => ipcRenderer.invoke(IpcChannels.tasksDelete, id), setCurrent: (id?: string) => ipcRenderer.invoke(IpcChannels.tasksSetCurrent, id) },
  settings: { get: () => ipcRenderer.invoke(IpcChannels.settingsGet), update: (input: unknown) => ipcRenderer.invoke(IpcChannels.settingsUpdate, input) },
  focusPresets: { list: () => ipcRenderer.invoke(IpcChannels.focusPresetsList), create: (input: unknown) => ipcRenderer.invoke(IpcChannels.focusPresetsCreate, input), update: (id: string, input: unknown) => ipcRenderer.invoke(IpcChannels.focusPresetsUpdate, id, input), delete: (id: string) => ipcRenderer.invoke(IpcChannels.focusPresetsDelete, id) },
  stats: { today: () => ipcRenderer.invoke(IpcChannels.statsToday) },
  onTimerTick: (callback: (value: unknown) => void) => subscribe(IpcChannels.timerTick, callback),
  onPhaseEnded: (callback: (value: unknown) => void) => subscribe(IpcChannels.timerPhaseEnded, callback),
  onCompletionSound: (callback: (value: unknown) => void) => subscribe(IpcChannels.completionSound, callback),
  onStoreError: (callback: (value: unknown) => void) => subscribe(IpcChannels.storeError, callback),
})

function subscribe(channel: string, callback: (value: unknown) => void): () => void { const listener = (_event: Electron.IpcRendererEvent, value: unknown) => callback(value); ipcRenderer.on(channel, listener); return () => ipcRenderer.removeListener(channel, listener) }
