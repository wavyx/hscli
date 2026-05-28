import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  readCheckpoint,
  writeCheckpoint,
  deleteCheckpoint,
  CHECKPOINT_FILE,
} from '../../../src/lib/backup/checkpoint.js'

describe('backup/checkpoint', () => {
  let dir
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hsc-'))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('readCheckpoint returns null when missing', async () => {
    expect(await readCheckpoint(dir)).toBeNull()
  })

  it('write then read round-trips', async () => {
    await writeCheckpoint(dir, {
      mode: 'incremental',
      completed: ['users'],
      inProgress: { resource: 'conversations', lastCompletedPage: 5 },
    })
    const r = await readCheckpoint(dir)
    expect(r.completed).toEqual(['users'])
    expect(r.inProgress.lastCompletedPage).toBe(5)
  })

  it('deleteCheckpoint removes file', async () => {
    await writeCheckpoint(dir, { foo: 1 })
    expect(existsSync(join(dir, CHECKPOINT_FILE))).toBe(true)
    await deleteCheckpoint(dir)
    expect(existsSync(join(dir, CHECKPOINT_FILE))).toBe(false)
  })

  it('deleteCheckpoint is idempotent on missing file', async () => {
    await expect(deleteCheckpoint(dir)).resolves.toBeUndefined()
  })

  it('readCheckpoint throws on non-ENOENT errors', async () => {
    writeFileSync(join(dir, CHECKPOINT_FILE), '{bad')
    await expect(readCheckpoint(dir)).rejects.toThrow()
  })
})
