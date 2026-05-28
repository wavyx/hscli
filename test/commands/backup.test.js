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

vi.mock('../../src/lib/keychain.js', () => ({
  getTokens: vi.fn().mockResolvedValue({
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    expiresAt: Date.now() + 86400000,
    authMode: 'authorization_code',
    credentialSource: 'byo',
  }),
  setTokens: vi.fn().mockResolvedValue(undefined),
  deleteTokens: vi.fn().mockResolvedValue(undefined),
  isKeychainAvailable: vi.fn().mockReturnValue(true),
}))

vi.mock('../../src/lib/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({ activeProfile: 'default' }),
  getActiveProfile: vi.fn().mockReturnValue('default'),
  setActiveProfile: vi.fn(),
  getConf: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue('default'),
    set: vi.fn(),
    path: '/tmp/test-config',
  }),
  getProfileConfig: vi.fn().mockReturnValue(undefined),
  setProfileConfig: vi.fn(),
  getProfileData: vi.fn().mockReturnValue({}),
  getAllProfiles: vi.fn().mockReturnValue({ default: {} }),
  deleteProfileConfig: vi.fn(),
}))

vi.mock('../../src/lib/auth.js', () => ({
  getValidToken: vi.fn().mockResolvedValue('test-token'),
  resolveCredentials: vi.fn().mockReturnValue({
    clientId: 'cid',
    clientSecret: 'csec',
    source: 'profile',
  }),
  refreshAccessToken: vi.fn().mockResolvedValue({
    accessToken: 'r',
    refreshToken: 'r',
    expiresIn: 172800,
  }),
}))

const { default: BackupCommand } = await import('../../src/commands/backup.js')

const API = 'https://api.helpscout.net'

function ep(key, items, { totalPages = 1, number = 1 } = {}) {
  return {
    _embedded: { [key]: items },
    page: {
      size: items.length,
      totalElements: items.length,
      totalPages,
      number,
    },
  }
}

function empty(key) {
  return {
    _embedded: { [key]: [] },
    page: { size: 0, totalElements: 0, totalPages: 1, number: 1 },
  }
}

function mockAllEmpty(except = []) {
  const set = [
    ['/v2/users', 'users'],
    ['/v2/teams', 'teams'],
    ['/v2/mailboxes', 'mailboxes'],
    ['/v2/tags', 'tags'],
    ['/v2/workflows', 'workflows'],
    ['/v2/webhooks', 'webhooks'],
    ['/v2/customers', 'customers'],
    ['/v2/conversations', 'conversations'],
  ]
  for (const [path, key] of set) {
    if (except.includes(path)) continue
    nock(API).get(path).query(true).reply(200, empty(key))
  }
}

function mockMe() {
  nock(API)
    .get('/v2/users/me')
    .reply(200, { id: 1, firstName: 'Eric', lastName: 'R' })
}

describe('hs backup', () => {
  let dir
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hsbk-'))
    nock.cleanAll()
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
    rmSync(`${dir}.tar.gz`, { force: true })
    nock.cleanAll()
  })

  it('first run: writes manifest with account info from /v2/users/me', async () => {
    mockMe()
    nock(API)
      .get('/v2/users')
      .query(true)
      .reply(200, ep('users', [{ id: 1, firstName: 'A' }]))
    mockAllEmpty(['/v2/users'])

    await BackupCommand.run(['--out', dir])
    const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
    expect(m.account.name).toBe('Eric R')
    expect(m.resources.users.total).toBe(1)
    expect(m.resources.users.lastSyncedAt).toBeDefined()
    expect(m.history).toHaveLength(1)
    expect(m.history[0].mode).toBe('full')
  })

  it('second run becomes incremental and passes modifiedSince', async () => {
    mockMe()
    mockAllEmpty()
    await BackupCommand.run(['--out', dir])

    const scope = nock(API)
      .get('/v2/users')
      .query((q) => typeof q.modifiedSince === 'string')
      .reply(200, empty('users'))
    mockAllEmpty(['/v2/users'])
    await BackupCommand.run(['--out', dir])
    expect(scope.isDone()).toBe(true)
    const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
    expect(m.history.map((h) => h.mode)).toEqual(['full', 'incremental'])
  })

  it('--full forces full re-sync even if manifest exists', async () => {
    mockMe()
    mockAllEmpty()
    await BackupCommand.run(['--out', dir])

    const scope = nock(API)
      .get('/v2/users')
      .query((q) => !('modifiedSince' in q))
      .reply(200, empty('users'))
    mockAllEmpty(['/v2/users'])
    await BackupCommand.run(['--out', dir, '--full'])
    expect(scope.isDone()).toBe(true)
  })

  it('refuses to write into existing non-backup directory', async () => {
    writeFileSync(join(dir, 'something.txt'), 'foreign')
    let err
    try {
      await BackupCommand.run(['--out', dir])
    } catch (e) {
      err = e
    }
    expect(err).toBeDefined()
    expect(err.message).toMatch(/not a hscli backup directory/i)
  })

  it('accepts empty existing directory', async () => {
    mockMe()
    mockAllEmpty()
    await BackupCommand.run(['--out', dir])
    expect(existsSync(join(dir, 'manifest.json'))).toBe(true)
  })

  it('--dry-run does not write files', async () => {
    mockMe()
    nock(API)
      .get('/v2/users')
      .query(true)
      .reply(200, ep('users', [{ id: 1 }]))
    mockAllEmpty(['/v2/users'])
    await BackupCommand.run(['--out', dir, '--dry-run'])
    expect(existsSync(join(dir, 'manifest.json'))).toBe(false)
    expect(existsSync(join(dir, 'account/users/1.json'))).toBe(false)
  })

  it('--include restricts to named resources', async () => {
    mockMe()
    nock(API)
      .get('/v2/users')
      .query(true)
      .reply(200, ep('users', [{ id: 1 }]))
    await BackupCommand.run(['--out', dir, '--include', 'users'])
    const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
    expect(Object.keys(m.resources)).toEqual(['users'])
  })

  it('--exclude removes resources', async () => {
    mockMe()
    mockAllEmpty(['/v2/users'])
    await BackupCommand.run(['--out', dir, '--exclude', 'users'])
    const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
    expect(m.resources.users).toBeUndefined()
  })

  it('--since overrides lastSyncedAt', async () => {
    mockMe()
    const scope = nock(API)
      .get('/v2/users')
      .query((q) => q.modifiedSince === '2024-01-01T00:00:00Z')
      .reply(200, empty('users'))
    await BackupCommand.run([
      '--out',
      dir,
      '--include',
      'users',
      '--since',
      '2024-01-01T00:00:00Z',
    ])
    expect(scope.isDone()).toBe(true)
  })

  it('--since 7d gets parsed into ISO', async () => {
    mockMe()
    const scope = nock(API)
      .get('/v2/users')
      .query(
        (q) =>
          typeof q.modifiedSince === 'string' &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(q.modifiedSince),
      )
      .reply(200, empty('users'))
    await BackupCommand.run([
      '--out',
      dir,
      '--include',
      'users',
      '--since',
      '7d',
    ])
    expect(scope.isDone()).toBe(true)
  })

  it('--reconcile writes _deleted.ndjson on second run when items disappear', async () => {
    mockMe()
    nock(API)
      .get('/v2/customers')
      .query(true)
      .reply(200, ep('customers', [{ id: 10 }, { id: 11 }]))
    await BackupCommand.run(['--out', dir, '--include', 'customers'])

    // remote: 11 gone
    nock(API).get('/v2/customers').query(true).reply(200, empty('customers'))
    // reconcile pass
    nock(API)
      .get('/v2/customers')
      .query(true)
      .reply(200, ep('customers', [{ id: 10 }]))
    await BackupCommand.run([
      '--out',
      dir,
      '--include',
      'customers',
      '--reconcile',
    ])
    const txt = readFileSync(join(dir, '_deleted.ndjson'), 'utf8')
    expect(txt).toMatch(/"id":11/)
  })

  it('--keep-history writes a delta log file', async () => {
    mockMe()
    nock(API)
      .get('/v2/users')
      .query(true)
      .reply(200, ep('users', [{ id: 1 }]))
    await BackupCommand.run([
      '--out',
      dir,
      '--include',
      'users',
      '--keep-history',
    ])
    const hdir = join(dir, '_history')
    const files = existsSync(hdir) ? require('node:fs').readdirSync(hdir) : []
    expect(files.length).toBeGreaterThan(0)
    const log = readFileSync(join(hdir, files[0]), 'utf8')
    expect(log).toMatch(/"op":"upsert"/)
    expect(log).toMatch(/"id":1/)
  })

  it('--attachments downloads binaries for embedded thread attachments', async () => {
    mockMe()
    nock(API)
      .get('/v2/conversations')
      .query(true)
      .reply(
        200,
        ep('conversations', [
          {
            id: 777,
            _embedded: {
              threads: [
                {
                  id: 1,
                  attachments: [{ id: 99, filename: 'shot.png' }],
                },
              ],
            },
          },
        ]),
      )
    nock(API)
      .get('/v2/attachments/99/data')
      .reply(200, { data: Buffer.from('PNGDATA').toString('base64') })

    await BackupCommand.run([
      '--out',
      dir,
      '--include',
      'conversations',
      '--attachments',
    ])
    const file = join(dir, 'conversations', '777', 'attachments', '99_shot.png')
    expect(existsSync(file)).toBe(true)
  })

  it('--compress produces tar.gz of the directory', async () => {
    mockMe()
    nock(API)
      .get('/v2/users')
      .query(true)
      .reply(200, ep('users', [{ id: 1 }]))
    await BackupCommand.run(['--out', dir, '--include', 'users', '--compress'])
    expect(existsSync(`${dir}.tar.gz`)).toBe(true)
  })

  it('--resume reads checkpoint and skips completed resources', async () => {
    // pre-seed manifest + checkpoint claiming users already done
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'manifest.json'),
      JSON.stringify({
        version: '0.5.0',
        hscliVersion: '0.5.0',
        account: {},
        history: [],
        resources: {},
      }),
    )
    writeFileSync(
      join(dir, 'checkpoint.json'),
      JSON.stringify({
        startedAt: '2026-05-28T10:00:00Z',
        mode: 'full',
        completed: ['users'],
      }),
    )
    // no /v2/users mock — must be skipped
    nock(API)
      .get('/v2/teams')
      .query(true)
      .reply(200, ep('teams', [{ id: 1 }]))
    await BackupCommand.run([
      '--out',
      dir,
      '--include',
      'users,teams',
      '--resume',
    ])
    expect(existsSync(join(dir, 'account/teams/1.json'))).toBe(true)
    expect(existsSync(join(dir, 'account/users/1.json'))).toBe(false)
  })

  it('falls back to empty account when /v2/users/me fails', async () => {
    nock(API).get('/v2/users/me').reply(500, '')
    mockAllEmpty()
    await BackupCommand.run(['--out', dir])
    const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
    expect(m.account).toEqual({})
  })

  it('--since 2h parses into ISO', async () => {
    mockMe()
    const scope = nock(API)
      .get('/v2/users')
      .query((q) => typeof q.modifiedSince === 'string')
      .reply(200, empty('users'))
    await BackupCommand.run([
      '--out',
      dir,
      '--include',
      'users',
      '--since',
      '2h',
    ])
    expect(scope.isDone()).toBe(true)
  })

  it('handles /v2/users/me returning empty user (no firstName/lastName)', async () => {
    nock(API).get('/v2/users/me').reply(200, { id: 1 })
    mockAllEmpty()
    await BackupCommand.run(['--out', dir])
    const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
    expect(m.account.name).toBe('')
  })

  it('--reconcile + --keep-history writes tombstones to history log', async () => {
    mockMe()
    nock(API)
      .get('/v2/customers')
      .query(true)
      .reply(200, ep('customers', [{ id: 5 }]))
    await BackupCommand.run(['--out', dir, '--include', 'customers'])

    nock(API).get('/v2/customers').query(true).reply(200, empty('customers'))
    nock(API).get('/v2/customers').query(true).reply(200, empty('customers'))
    await BackupCommand.run([
      '--out',
      dir,
      '--include',
      'customers',
      '--reconcile',
      '--keep-history',
    ])
    const hdir = join(dir, '_history')
    const fs = await import('node:fs')
    const files = fs.readdirSync(hdir).filter((f) => f.includes('incremental'))
    expect(files.length).toBeGreaterThan(0)
    const log = readFileSync(join(hdir, files[files.length - 1]), 'utf8')
    expect(log).toMatch(/"op":"delete"/)
    expect(log).toMatch(/"id":5/)
  })

  it('--since 30m parses into ISO', async () => {
    mockMe()
    const scope = nock(API)
      .get('/v2/users')
      .query((q) => typeof q.modifiedSince === 'string')
      .reply(200, empty('users'))
    await BackupCommand.run([
      '--out',
      dir,
      '--include',
      'users',
      '--since',
      '30m',
    ])
    expect(scope.isDone()).toBe(true)
  })
})
