import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createEmptyAppData } from '../../../shared/defaults'
import type { AppData } from '../../../shared/types'

export class AppStore {
  private recoveredCorruptData = false
  constructor(private readonly filePath: string) {}

  async load(): Promise<AppData> {
    try {
      const raw = await readFile(this.filePath, 'utf8')
      return validateAppData(JSON.parse(raw))
    } catch (error: unknown) {
      if (isMissingFileError(error)) return createEmptyAppData()
      if (await this.backupCorruptFile()) {
        this.recoveredCorruptData = true
        return createEmptyAppData()
      }
      throw new Error(`无法读取本地数据：${getErrorMessage(error)}`, { cause: error })
    }
  }

  async save(data: AppData): Promise<void> {
    const checkedData = validateAppData(data)
    const directory = dirname(this.filePath)
    const temporaryPath = `${this.filePath}.tmp`

    try {
      await mkdir(directory, { recursive: true })
      await writeFile(temporaryPath, JSON.stringify(checkedData, null, 2), 'utf8')
      await rename(temporaryPath, this.filePath)
    } catch (error: unknown) {
      throw new Error(`无法保存本地数据：${getErrorMessage(error)}`, { cause: error })
    }
  }

  consumeRecoveryNotice(): boolean {
    const recovered = this.recoveredCorruptData
    this.recoveredCorruptData = false
    return recovered
  }

  private async backupCorruptFile(): Promise<boolean> {
    try {
      await rename(this.filePath, `${this.filePath}.corrupt-${Date.now()}`)
      return true
    } catch {
      return false
    }
  }
}

function validateAppData(value: unknown): AppData {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.tasks) || !Array.isArray(value.sessions)) {
    throw new Error('数据格式不受支持')
  }

  const settings = value.settings
  if (!isRecord(settings) || typeof settings.focusMinutes !== 'number' || typeof settings.shortBreakMinutes !== 'number'
    || typeof settings.longBreakMinutes !== 'number' || typeof settings.longBreakInterval !== 'number'
    || typeof settings.soundEnabled !== 'boolean' || typeof settings.notificationEnabled !== 'boolean' || settings.locale !== 'zh-CN'
    || (settings.restSoundMode !== undefined && settings.restSoundMode !== 'quiet' && settings.restSoundMode !== 'music' && settings.restSoundMode !== 'whiteNoise')) {
    throw new Error('设置数据格式不受支持')
  }

  const customFocusPresets = value.customFocusPresets === undefined ? [] : value.customFocusPresets
  if (!Array.isArray(customFocusPresets) || !customFocusPresets.every(isValidFocusPreset)) throw new Error('专注方案数据格式不受支持')
  return { ...value, settings: { ...settings, restSoundMode: settings.restSoundMode === 'music' ? 'music' : 'quiet' }, customFocusPresets } as unknown as AppData
}

function isValidFocusPreset(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || !value.name.trim()) return false
  return ['focusMinutes', 'shortBreakMinutes', 'longBreakMinutes', 'longBreakInterval'].every((key) => typeof value[key] === 'number' && Number.isInteger(value[key]) && value[key] > 0)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return isRecord(error) && error.code === 'ENOENT'
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
