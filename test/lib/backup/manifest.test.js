import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  newManifest,
  readManifest,
  writeManifest,
  isBackupDir,
  MANIFEST_VERSION,
} from '../../../src/lib/backup/manifest.js'

describe('backup/manifest', () => {
  let dir
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hsm-'))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('newManifest returns a fresh shape', () => {
    const m = newManifest({ id: 1, name: 'Acme' }, '0.5.0')
    expect(m.version).toBe(MANIFEST_VERSION)
    expect(m.hscliVersion).toBe('0.5.0')
    expect(m.account.name).toBe('Acme')
    expect(m.history).toEqual([])
    expect(m.resources).toEqual({})
  })

  it('newManifest handles missing account', () => {
    const m = newManifest(undefined, '0.5.0')
    expect(m.account).toEqual({})
  })

  it('readManifest returns null when missing', async () => {
    expect(await readManifest(dir)).toBeNull()
  })

  it('writeManifest then readManifest round-trips', async () => {
    const m = newManifest({ id: 1, name: 'Acme' }, '0.5.0')
    m.resources.conversations = {
      lastSyncedAt: '2026-05-28T10:00:00Z',
      total: 5,
    }
    await writeManifest(dir, m)
    const r = await readManifest(dir)
    expect(r.account.name).toBe('Acme')
    expect(r.resources.conversations.total).toBe(5)
  })

  it('writeManifest creates dir if missing', async () => {
    const nested = join(dir, 'a', 'b')
    await writeManifest(nested, newManifest({}, '0.5.0'))
    expect(await readManifest(nested)).not.toBeNull()
  })

  it('isBackupDir returns false when manifest absent', async () => {
    expect(await isBackupDir(dir)).toBe(false)
  })

  it('isBackupDir returns true when manifest present', async () => {
    await writeManifest(dir, newManifest({}, '0.5.0'))
    expect(await isBackupDir(dir)).toBe(true)
  })

  it('readManifest throws on non-ENOENT errors', async () => {
    writeFileSync(join(dir, 'manifest.json'), '{not valid json')
    await expect(readManifest(dir)).rejects.toThrow()
  })
})
