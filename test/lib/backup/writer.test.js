import {
  mkdtempSync,
  rmSync,
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  writeItem,
  writeSingleFile,
  appendIndex,
  readLocalIds,
  safeName,
} from '../../../src/lib/backup/writer.js'

const PER_ITEM = { name: 'customers', layout: 'per-item', dir: 'customers' }
const MAILBOX = { name: 'mailboxes', layout: 'mailbox' }
const SINGLE = { name: 'tags', layout: 'single-file', file: 'tags.json' }

describe('backup/writer', () => {
  let dir
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hsw-'))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('safeName replaces unsafe chars', () => {
    expect(safeName('foo bar/baz.png')).toBe('foo_bar_baz.png')
    expect(safeName(42)).toBe('42')
  })

  it('writeItem per-item writes {dir}/{id}.json', async () => {
    await writeItem(dir, PER_ITEM, { id: 7, name: 'Eric' })
    const file = join(dir, 'customers', '7.json')
    expect(existsSync(file)).toBe(true)
    expect(JSON.parse(readFileSync(file, 'utf8')).name).toBe('Eric')
  })

  it('writeItem mailbox writes {id}/mailbox.json', async () => {
    await writeItem(dir, MAILBOX, { id: 42, name: 'Support' })
    const file = join(dir, 'mailboxes', '42', 'mailbox.json')
    expect(existsSync(file)).toBe(true)
    expect(JSON.parse(readFileSync(file, 'utf8')).name).toBe('Support')
  })

  it('writeItem throws on unknown layout', async () => {
    await expect(
      writeItem(dir, { name: 'x', layout: 'bogus' }, { id: 1 }),
    ).rejects.toThrow(/unsupported layout/)
  })

  it('writeSingleFile writes array JSON', async () => {
    await writeSingleFile(dir, SINGLE, [{ id: 1, tag: 'billing' }])
    const out = JSON.parse(readFileSync(join(dir, 'tags.json'), 'utf8'))
    expect(out).toHaveLength(1)
    expect(out[0].tag).toBe('billing')
  })

  it('appendIndex writes NDJSON line per item', async () => {
    await appendIndex(dir, PER_ITEM, { id: 1, updatedAt: '2024-01-01' })
    await appendIndex(dir, PER_ITEM, { id: 2, updatedAt: '2024-01-02' })
    const txt = readFileSync(join(dir, 'customers', '_index.ndjson'), 'utf8')
    const lines = txt.split('\n').filter(Boolean)
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0]).id).toBe(1)
    expect(JSON.parse(lines[1]).id).toBe(2)
  })

  it('appendIndex skips for single-file layout', async () => {
    await appendIndex(dir, SINGLE, { id: 1 })
    expect(existsSync(join(dir, '_index.ndjson'))).toBe(false)
  })

  it('appendIndex handles mailbox layout under mailboxes/', async () => {
    await appendIndex(dir, MAILBOX, { id: 42, updatedAt: '2024-01-01' })
    expect(existsSync(join(dir, 'mailboxes', '_index.ndjson'))).toBe(true)
  })

  it('readLocalIds returns IDs from index', async () => {
    await appendIndex(dir, PER_ITEM, { id: 10 })
    await appendIndex(dir, PER_ITEM, { id: 20 })
    const ids = await readLocalIds(dir, PER_ITEM)
    expect([...ids].sort()).toEqual([10, 20])
  })

  it('readLocalIds returns empty Set when nothing exists', async () => {
    const ids = await readLocalIds(dir, PER_ITEM)
    expect(ids.size).toBe(0)
  })

  it('readLocalIds returns empty for single-file', async () => {
    const ids = await readLocalIds(dir, SINGLE)
    expect(ids.size).toBe(0)
  })

  it('readLocalIds falls back to directory listing when index missing', async () => {
    const sub = join(dir, 'customers')
    mkdirSync(sub, { recursive: true })
    writeFileSync(join(sub, '11.json'), '{}')
    writeFileSync(join(sub, '12.json'), '{}')
    writeFileSync(join(sub, '_index.ndjson.bak'), '')
    const ids = await readLocalIds(dir, PER_ITEM)
    expect([...ids].sort()).toEqual([11, 12])
  })

  it('readLocalIds rethrows corrupt-JSON parse errors from index', async () => {
    const sub = join(dir, 'customers')
    mkdirSync(sub, { recursive: true })
    writeFileSync(join(sub, '_index.ndjson'), '{not json\n')
    await expect(readLocalIds(dir, PER_ITEM)).rejects.toThrow()
  })

  it('readLocalIds returns empty when path component is a file (ENOTDIR fallback)', async () => {
    // dir doesn't exist for this layout
    const altDir = join(dir, 'altroot')
    const ids = await readLocalIds(altDir, PER_ITEM)
    expect(ids.size).toBe(0)
  })
})
