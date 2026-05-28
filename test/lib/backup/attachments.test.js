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
import nock from 'nock'
import { createClient } from '../../../src/lib/client.js'
import {
  downloadAttachment,
  processConversationAttachments,
  writeAttachmentsManifest,
} from '../../../src/lib/backup/attachments.js'

const API = 'https://api.helpscout.net'

describe('backup/attachments', () => {
  let dir, client
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hsatt-'))
    client = createClient({ accessToken: 'tok', retry: false, timeout: 5000 })
    nock.cleanAll()
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
    nock.cleanAll()
  })

  it('downloadAttachment writes binary from base64 payload', async () => {
    const body = 'hello world'
    nock(API)
      .get('/v2/attachments/77/data')
      .reply(200, { data: Buffer.from(body).toString('base64') })

    const r = await downloadAttachment(client, dir, 123, {
      id: 77,
      filename: 'note.txt',
    })
    expect(r.skipped).toBe(false)
    expect(readFileSync(r.file, 'utf8')).toBe(body)
  })

  it('downloadAttachment skips when file already exists', async () => {
    const sub = join(dir, 'conversations', '123', 'attachments')
    mkdirSync(sub, { recursive: true })
    const file = join(sub, '77_note.txt')
    writeFileSync(file, 'pre-existing')
    const r = await downloadAttachment(client, dir, 123, {
      id: 77,
      filename: 'note.txt',
    })
    expect(r.skipped).toBe(true)
    expect(readFileSync(r.file, 'utf8')).toBe('pre-existing')
  })

  it('downloadAttachment uses safe filename', async () => {
    nock(API).get('/v2/attachments/9/data').reply(200, { data: '' })
    const r = await downloadAttachment(client, dir, 1, {
      id: 9,
      filename: 'evil/../name.png',
    })
    expect(r.file).toMatch(/9_evil_.._name\.png$/)
  })

  it('downloadAttachment handles missing filename', async () => {
    nock(API).get('/v2/attachments/10/data').reply(200, { data: '' })
    const r = await downloadAttachment(client, dir, 1, { id: 10 })
    expect(r.file).toMatch(/10_file$/)
  })

  it('processConversationAttachments returns counts and writes manifest', async () => {
    const conv = {
      id: 555,
      _embedded: {
        threads: [
          { id: 1, attachments: [{ id: 10, filename: 'a.png' }] },
          { id: 2, attachments: [{ id: 11, filename: 'b.png' }] },
        ],
      },
    }
    nock(API)
      .get('/v2/attachments/10/data')
      .reply(200, { data: Buffer.from('a').toString('base64') })
      .get('/v2/attachments/11/data')
      .reply(200, { data: Buffer.from('b').toString('base64') })

    const r = await processConversationAttachments({
      client,
      baseDir: dir,
      conversation: conv,
    })
    expect(r.downloaded).toBe(2)
    expect(r.skipped).toBe(0)
    const manifest = JSON.parse(
      readFileSync(
        join(dir, 'conversations', '555', 'attachments', '_manifest.json'),
        'utf8',
      ),
    )
    expect(Object.keys(manifest).sort()).toEqual(['10', '11'])
  })

  it('processConversationAttachments returns zero counts when no attachments', async () => {
    const conv = { id: 1, _embedded: { threads: [{ id: 1 }] } }
    const r = await processConversationAttachments({
      client,
      baseDir: dir,
      conversation: conv,
    })
    expect(r.downloaded).toBe(0)
    expect(r.skipped).toBe(0)
  })

  it('processConversationAttachments handles conv with no embedded data', async () => {
    const r = await processConversationAttachments({
      client,
      baseDir: dir,
      conversation: { id: 9 },
    })
    expect(r.downloaded).toBe(0)
  })

  it('processConversationAttachments respects parallel concurrency', async () => {
    let active = 0
    let maxActive = 0
    const conv = {
      id: 1,
      _embedded: {
        threads: [
          {
            id: 1,
            attachments: [
              { id: 1, filename: 'a' },
              { id: 2, filename: 'b' },
              { id: 3, filename: 'c' },
              { id: 4, filename: 'd' },
            ],
          },
        ],
      },
    }
    for (let i = 1; i <= 4; i++) {
      nock(API)
        .get(`/v2/attachments/${i}/data`)
        .delay(20)
        .reply(200, () => {
          active++
          maxActive = Math.max(maxActive, active)
          setTimeout(() => active--, 5)
          return { data: '' }
        })
    }
    await processConversationAttachments({
      client,
      baseDir: dir,
      conversation: conv,
      parallel: 2,
    })
    expect(maxActive).toBeLessThanOrEqual(2)
  })

  it('processConversationAttachments uses default parallel of 4 when 0 passed', async () => {
    const conv = {
      id: 1,
      _embedded: {
        threads: [{ id: 1, attachments: [{ id: 1, filename: 'a' }] }],
      },
    }
    nock(API).get('/v2/attachments/1/data').reply(200, { data: '' })
    const r = await processConversationAttachments({
      client,
      baseDir: dir,
      conversation: conv,
      parallel: 0,
    })
    expect(r.downloaded).toBe(1)
  })

  it('writeAttachmentsManifest merges with existing entries', async () => {
    await writeAttachmentsManifest(dir, 1, [{ id: 10, filename: 'a' }])
    await writeAttachmentsManifest(dir, 1, [{ id: 11, filename: 'b' }])
    const file = join(
      dir,
      'conversations',
      '1',
      'attachments',
      '_manifest.json',
    )
    const m = JSON.parse(readFileSync(file, 'utf8'))
    expect(Object.keys(m).sort()).toEqual(['10', '11'])
  })

  it('writeAttachmentsManifest ignores corrupt existing JSON', async () => {
    const subDir = join(dir, 'conversations', '1', 'attachments')
    mkdirSync(subDir, { recursive: true })
    writeFileSync(join(subDir, '_manifest.json'), '{not json')
    await writeAttachmentsManifest(dir, 1, [{ id: 99, filename: 'x' }])
    const m = JSON.parse(readFileSync(join(subDir, '_manifest.json'), 'utf8'))
    expect(m['99'].filename).toBe('x')
  })

  it('processConversationAttachments counts skipped when files already exist', async () => {
    const sub = join(dir, 'conversations', '500', 'attachments')
    mkdirSync(sub, { recursive: true })
    writeFileSync(join(sub, '99_x.png'), 'pre')
    const conv = {
      id: 500,
      _embedded: {
        threads: [{ id: 1, attachments: [{ id: 99, filename: 'x.png' }] }],
      },
    }
    const r = await processConversationAttachments({
      client,
      baseDir: dir,
      conversation: conv,
    })
    expect(r.downloaded).toBe(0)
    expect(r.skipped).toBe(1)
  })

  it('handles attachment with missing data field', async () => {
    nock(API).get('/v2/attachments/1/data').reply(200, {})
    const r = await downloadAttachment(client, dir, 1, { id: 1, filename: 'x' })
    expect(existsSync(r.file)).toBe(true)
  })
})
