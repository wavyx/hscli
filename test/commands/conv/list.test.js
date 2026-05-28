import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(
    join(__dirname, '../../fixtures/conversations-list.json'),
    'utf8',
  ),
)

vi.mock('../../../src/lib/keychain.js', () => ({
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

vi.mock('../../../src/lib/config.js', () => ({
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

vi.mock('../../../src/lib/auth.js', () => ({
  getValidToken: vi.fn().mockResolvedValue('test-token'),
  resolveCredentials: vi.fn().mockReturnValue({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    source: 'profile',
  }),
  refreshAccessToken: vi.fn().mockResolvedValue({
    accessToken: 'refreshed-token',
    refreshToken: 'refreshed-refresh',
    expiresIn: 172800,
  }),
}))

const { default: ConvListCommand } =
  await import('../../../src/commands/conv/list.js')

describe('hs conv list', () => {
  afterEach(() => nock.cleanAll())

  it('returns conversations as JSON array', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(ConvListCommand, ['--output', 'json'])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output[0].subject).toBe('Need help with billing')
    expect(output[1].subject).toBe('API integration question')
    expect(scope.isDone()).toBe(true)
  })

  it('renders conversations in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(ConvListCommand, ['--output', 'table'])

    expect(stdout).toContain('Need help with billing')
    expect(stdout).toContain('API integration question')
    expect(stdout).toContain('Jane Doe')
    expect(scope.isDone()).toBe(true)
  })

  it('passes status query parameter to API', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => q.status === 'closed')
      .reply(200, fixture)

    const stdout = await runCmd(ConvListCommand, [
      '--status',
      'closed',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })

  it('passes mailbox query parameter to API', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => q.mailbox === '42')
      .reply(200, fixture)

    const stdout = await runCmd(ConvListCommand, [
      '--mailbox',
      '42',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })

  it('passes modifiedSince when --since is an ISO date', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => q.modifiedSince === '2024-06-01T00:00:00Z')
      .reply(200, fixture)

    const stdout = await runCmd(ConvListCommand, [
      '--since',
      '2024-06-01T00:00:00Z',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })

  it('converts relative --since to ISO date without milliseconds', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => {
        const val = q.modifiedSince
        const parsed = new Date(val)
        const isValidDate = !isNaN(parsed.getTime())
        const hasNoMilliseconds = !val.includes('.')
        return isValidDate && hasNoMilliseconds
      })
      .reply(200, fixture)

    const stdout = await runCmd(ConvListCommand, [
      '--since',
      '7d',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })

  it('strips milliseconds from relative date for Help Scout compatibility', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => {
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(q.modifiedSince)
      })
      .reply(200, fixture)

    await runCmd(ConvListCommand, ['--since', '30d', '--output', 'json'])

    expect(scope.isDone()).toBe(true)
  })

  it('parses --since with hours unit', async () => {
    const before = Date.now()

    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => {
        const val = q.modifiedSince
        // Must be a valid ISO date without milliseconds
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(val)) return false
        const parsed = new Date(val).getTime()
        // 2 hours = 7200000ms; allow 5s tolerance
        const expectedMin = before - 2 * 60 * 60 * 1000 - 5000
        const expectedMax = before - 2 * 60 * 60 * 1000 + 5000
        return parsed >= expectedMin && parsed <= expectedMax
      })
      .reply(200, fixture)

    const stdout = await runCmd(ConvListCommand, [
      '--since',
      '2h',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })

  it('filters by --source client-side', async () => {
    const mixed = {
      _embedded: {
        conversations: [
          {
            id: 1,
            subject: 'A',
            status: 'active',
            mailboxId: 1,
            createdAt: '2024-01-01',
            source: { type: 'email', via: 'customer' },
          },
          {
            id: 2,
            subject: 'B',
            status: 'active',
            mailboxId: 1,
            createdAt: '2024-01-02',
            source: { type: 'beacon', via: 'customer' },
          },
          {
            id: 3,
            subject: 'C',
            status: 'active',
            mailboxId: 1,
            createdAt: '2024-01-03',
            source: { type: 'beacon', via: 'customer' },
          },
        ],
      },
      page: { size: 3, totalElements: 3, totalPages: 1, number: 1 },
    }
    nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, mixed)
    const stdout = await runCmd(ConvListCommand, [
      '--source',
      'beacon',
      '--output',
      'json',
    ])
    const out = JSON.parse(stdout)
    expect(out).toHaveLength(2)
    expect(out.every((c) => c.source.type === 'beacon')).toBe(true)
  })

  it('honors --limit even with --source filter', async () => {
    const mixed = {
      _embedded: {
        conversations: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          subject: `s${i}`,
          status: 'active',
          mailboxId: 1,
          createdAt: '2024-01-01',
          source: { type: 'beacon', via: 'customer' },
        })),
      },
      page: { size: 10, totalElements: 10, totalPages: 1, number: 1 },
    }
    nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, mixed)
    const stdout = await runCmd(ConvListCommand, [
      '--source',
      'beacon',
      '--limit',
      '3',
      '--output',
      'json',
    ])
    expect(JSON.parse(stdout)).toHaveLength(3)
  })

  it('rejects unknown --source value', async () => {
    let err
    try {
      await ConvListCommand.run(['--source', 'bogus'])
    } catch (e) {
      err = e
    }
    expect(err).toBeDefined()
    expect(err.message).toMatch(/source.*bogus/i)
  })

  it('parses --since with minutes unit', async () => {
    const before = Date.now()

    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => {
        const val = q.modifiedSince
        // Must be a valid ISO date without milliseconds
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(val)) return false
        const parsed = new Date(val).getTime()
        // 30 minutes = 1800000ms; allow 5s tolerance
        const expectedMin = before - 30 * 60 * 1000 - 5000
        const expectedMax = before - 30 * 60 * 1000 + 5000
        return parsed >= expectedMin && parsed <= expectedMax
      })
      .reply(200, fixture)

    const stdout = await runCmd(ConvListCommand, [
      '--since',
      '30m',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })
})
