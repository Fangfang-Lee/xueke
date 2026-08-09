import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AppStore } from '../store/appStore'
import { SessionService } from './sessionService'

const directories: string[] = []
async function createService(): Promise<{ service: SessionService; store: AppStore }> {
  const directory = await mkdtemp(join(tmpdir(), 'xueke-session-')); directories.push(directory)
  const store = new AppStore(join(directory, 'data.json')); const service = new SessionService(store); await service.initialize()
  return { service, store }
}
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))) })

describe('SessionService', () => {
  it('marks an unfinished session as interrupted after restart', async () => {
    const { service, store } = await createService(); await service.start(); service.dispose()
    const restarted = new SessionService(store); await restarted.initialize()
    expect(restarted.sessions()[0]).toMatchObject({ completed: false })
    expect(restarted.sessions()[0].endedAt).toBeTruthy(); restarted.dispose()
  })

  it('does not finish a phase twice when skip is requested concurrently', async () => {
    const { service } = await createService(); await service.start()
    await Promise.all([service.skip(), service.skip()])
    expect(service.sessions()).toHaveLength(1)
    expect(service.snapshot()).toMatchObject({ status: 'idle', phase: 'shortBreak' })
    service.dispose()
  })
})
