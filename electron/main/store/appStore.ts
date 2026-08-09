import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createEmptyAppData } from '../../../shared/defaults'
import type { AppData } from '../../../shared/types'

export class AppStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<AppData> {
    try {
      const raw = await readFile(this.filePath, 'utf8')
      return validateAppData(JSON.parse(raw))
    } catch (error: unknown) {
      if (isMissingFileError(error)) return createEmptyAppData()
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
}

function validateAppData(value: unknown): AppData {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.tasks) || !Array.isArray(value.sessions)) {
    throw new Error('数据格式不受支持')
  }

  const settings = value.settings
  if (!isRecord(settings) || typeof settings.focusMinutes !== 'number' || typeof settings.shortBreakMinutes !== 'number'
    || typeof settings.longBreakMinutes !== 'number' || typeof settings.longBreakInterval !== 'number'
    || typeof settings.soundEnabled !== 'boolean' || typeof settings.notificationEnabled !== 'boolean' || settings.locale !== 'zh-CN') {
    throw new Error('设置数据格式不受支持')
  }

  return value as unknown as AppData
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
