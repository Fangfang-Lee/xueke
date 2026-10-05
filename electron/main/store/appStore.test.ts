import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createEmptyAppData } from '../../../shared/defaults'
import { AppStore } from './appStore'

const directories: string[] = []

async function createStore(): Promise<{ store: AppStore; path: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'xueke-store-'))
  directories.push(directory)
  const path = join(directory, 'xueke-data.json')
  return { store: new AppStore(path), path }
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('AppStore', () => {
  it('loads defaults when the data file does not exist', async () => {
    const { store } = await createStore()
    expect(await store.load()).toEqual(createEmptyAppData())
  })

  it('roundtrips tasks and settings', async () => {
    const { store, path } = await createStore()
    const data = createEmptyAppData()
    data.tasks.push({ id: 'task-1', title: '数学', status: 'active', createdAt: '2026-07-14T00:00:00.000Z' })
    data.settings.focusMinutes = 30

    await store.save(data)
    expect(await store.load()).toEqual(data)
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(data)
  })

  it('backs up corrupt JSON and restores empty data', async () => {
    const { store, path } = await createStore()
    await writeFile(path, '{invalid json', 'utf8')
    expect(await store.load()).toEqual(createEmptyAppData())
    expect(store.consumeRecoveryNotice()).toBe(true)
    expect((await readdir(join(path, '..'))).some((file) => file.startsWith('xueke-data.json.corrupt-'))).toBe(true)
  })

  it('adds an empty preset list when loading data from before presets existed', async () => {
    const { store, path } = await createStore()
    const { customFocusPresets: _unused, ...legacyData } = createEmptyAppData()
    await writeFile(path, JSON.stringify(legacyData), 'utf8')
    expect((await store.load()).customFocusPresets).toEqual([])
  })

  it('uses quiet rest sound when loading data from before rest sound modes existed', async () => {
    const { store, path } = await createStore()
    const data = createEmptyAppData()
    const { restSoundMode: _unused, ...legacySettings } = data.settings
    await writeFile(path, JSON.stringify({ ...data, settings: legacySettings }), 'utf8')
    expect((await store.load()).settings.restSoundMode).toBe('quiet')
  })

  it('migrates the retired white-noise setting to quiet', async () => {
    const { store, path } = await createStore()
    const data = createEmptyAppData()
    await writeFile(path, JSON.stringify({ ...data, settings: { ...data.settings, restSoundMode: 'whiteNoise' } }), 'utf8')
    expect((await store.load()).settings.restSoundMode).toBe('quiet')
  })
})
