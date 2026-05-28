import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { HistoryLog } from '../../../src/lib/backup/history.js'

describe('backup/history', () => {
  let dir
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hsh-'))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('filename embeds timestamp and mode', () => {
    const log = new HistoryLog(dir, 'full', new Date('2026-05-28T10:00:00Z'))
    expect(log.file).toMatch(/2026-05-28T10-00-00-000-full\.ndjson$/)
  })

  it('upsert appends a line', async () => {
    const log = new HistoryLog(dir, 'full', new Date('2026-05-28T10:00:00Z'))
    await log.upsert('conversations', { id: 1, subject: 'x' })
    await log.upsert('conversations', { id: 2 })
    const txt = readFileSync(log.file, 'utf8')
    const lines = txt.split('\n').filter(Boolean)
    expect(lines).toHaveLength(2)
    const first = JSON.parse(lines[0])
    expect(first.op).toBe('upsert')
    expect(first.resource).toBe('conversations')
    expect(first.id).toBe(1)
    expect(first.snapshot.subject).toBe('x')
  })

  it('tombstone appends a delete line', async () => {
    const log = new HistoryLog(dir, 'reconcile')
    await log.tombstone('customers', 99)
    const txt = readFileSync(log.file, 'utf8')
    const line = JSON.parse(txt.trim())
    expect(line.op).toBe('delete')
    expect(line.id).toBe(99)
    expect(line.tombstoneAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('does not create dir until first write', async () => {
    new HistoryLog(dir, 'full')
    expect(existsSync(join(dir, '_history'))).toBe(false)
  })

  it('_ensure runs once', async () => {
    const log = new HistoryLog(dir, 'full')
    await log.upsert('x', { id: 1 })
    await log.upsert('x', { id: 2 })
    expect(log._ensured).toBe(true)
  })
})
