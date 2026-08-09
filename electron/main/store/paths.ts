import { join } from 'node:path'

export function getAppDataFilePath(userDataPath: string): string {
  return join(userDataPath, 'xueke-data.json')
}
