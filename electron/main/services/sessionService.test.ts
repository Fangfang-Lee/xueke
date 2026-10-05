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
  it('starts a long break after the configured number of completed focuses', async () => {
    const { service } = await createService()
    await service.updateSettings({ longBreakInterval: 2 })
    const testable = service as unknown as { finish: (completed: boolean) => Promise<void> }

    await service.start(); await testable.finish(true)
    expect(service.snapshot()).toMatchObject({ phase: 'shortBreak', status: 'running', completedFocusCountInCycle: 1 })
    await service.start(); await testable.finish(true)
    expect(service.snapshot()).toMatchObject({ phase: 'focus', completedFocusCountInCycle: 1 })
    await service.start(); await testable.finish(true)
    expect(service.snapshot()).toMatchObject({ phase: 'longBreak', status: 'running', completedFocusCountInCycle: 0 })
    service.dispose()
  })

  it('keeps a paused timer from advancing until it resumes', async () => {
    const { service } = await createService()
    await service.start(); const paused = service.pause()
    expect(paused.status).toBe('paused')
    expect(service.resume().status).toBe('running')
    service.dispose()
  })

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

  it('starts focus immediately when a rest is skipped', async () => {
    const { service } = await createService()
    const testable = service as unknown as { finish: (completed: boolean) => Promise<void> }
    await service.start(); await testable.finish(true)
    expect(service.snapshot()).toMatchObject({ phase: 'shortBreak', status: 'running' })
    await service.skip()
    expect(service.snapshot()).toMatchObject({ phase: 'focus', status: 'running' })
    expect(service.sessions().at(-2)).toMatchObject({ type: 'shortBreak', completed: false })
    service.dispose()
  })

  it('persists, updates, and deletes custom focus presets', async () => {
    const { service, store } = await createService()
    const created = await service.createFocusPreset({ name: '晚间学习', focusMinutes: 30, shortBreakMinutes: 5, longBreakMinutes: 20, longBreakInterval: 4 })
    expect(service.focusPresets()).toEqual([created])
    const updated = await service.updateFocusPreset(created.id, { name: '晚间复习', focusMinutes: 35, shortBreakMinutes: 5, longBreakMinutes: 20, longBreakInterval: 3 })
    expect(updated.name).toBe('晚间复习')
    const restarted = new SessionService(store); await restarted.initialize()
    expect(restarted.focusPresets()).toEqual([updated])
    await restarted.deleteFocusPreset(created.id)
    expect(restarted.focusPresets()).toEqual([])
    service.dispose(); restarted.dispose()
  })
})
