import nock from 'nock'
import { runCmd } from '../../helpers.js'

vi.mock('../../../src/lib/keychain.js', () => ({
  getTokens: vi.fn().mockResolvedValue({
    accessToken: 't',
    refreshToken: 'r',
    expiresAt: Date.now() + 86400000,
    authMode: 'client_credentials',
    credentialSource: 'byo',
  }),
  setTokens: vi.fn(),
  deleteTokens: vi.fn(),
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
  getValidToken: vi.fn().mockResolvedValue('t'),
  resolveCredentials: vi.fn().mockReturnValue({
    clientId: 'cid',
    clientSecret: 'csec',
    source: 'profile',
  }),
  refreshAccessToken: vi.fn(),
}))

const { default: ReportBeaconCommand } =
  await import('../../../src/commands/report/beacon.js')

const API = 'https://api.helpscout.net'

function page(items) {
  return {
    _embedded: { conversations: items },
    page: {
      size: items.length,
      totalElements: items.length,
      totalPages: 1,
      number: 1,
    },
  }
}

describe('hs report beacon', () => {
  afterEach(() => nock.cleanAll())

  it('aggregates by source.type and source.via with percentages', async () => {
    nock(API)
      .get('/v2/conversations')
      .query(true)
      .reply(
        200,
        page([
          { id: 1, source: { type: 'email', via: 'customer' } },
          { id: 2, source: { type: 'email', via: 'customer' } },
          { id: 3, source: { type: 'beacon', via: 'customer' } },
          { id: 4, source: { type: 'chat', via: 'user' } },
        ]),
      )

    const stdout = await runCmd(ReportBeaconCommand, ['--output', 'json'])
    const rows = JSON.parse(stdout)
    expect(rows).toHaveLength(3)
    const email = rows.find((r) => r.type === 'email')
    expect(email.count).toBe(2)
    expect(email.pct).toBe(50)
  })

  it('--mailbox passes mailbox query param', async () => {
    const scope = nock(API)
      .get('/v2/conversations')
      .query((q) => q.mailbox === '42')
      .reply(200, page([]))
    await runCmd(ReportBeaconCommand, ['--mailbox', '42', '--output', 'json'])
    expect(scope.isDone()).toBe(true)
  })

  it('--since 7d parses to ISO modifiedSince', async () => {
    const scope = nock(API)
      .get('/v2/conversations')
      .query(
        (q) =>
          typeof q.modifiedSince === 'string' &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(q.modifiedSince),
      )
      .reply(200, page([]))
    await runCmd(ReportBeaconCommand, ['--since', '7d', '--output', 'json'])
    expect(scope.isDone()).toBe(true)
  })

  it('--since with hours unit', async () => {
    const scope = nock(API)
      .get('/v2/conversations')
      .query((q) => typeof q.modifiedSince === 'string')
      .reply(200, page([]))
    await runCmd(ReportBeaconCommand, ['--since', '2h', '--output', 'json'])
    expect(scope.isDone()).toBe(true)
  })

  it('--since with minutes unit', async () => {
    const scope = nock(API)
      .get('/v2/conversations')
      .query((q) => typeof q.modifiedSince === 'string')
      .reply(200, page([]))
    await runCmd(ReportBeaconCommand, ['--since', '30m', '--output', 'json'])
    expect(scope.isDone()).toBe(true)
  })

  it('handles literal ISO date in --since', async () => {
    const scope = nock(API)
      .get('/v2/conversations')
      .query((q) => q.modifiedSince === '2024-01-01T00:00:00Z')
      .reply(200, page([]))
    await runCmd(ReportBeaconCommand, [
      '--since',
      '2024-01-01T00:00:00Z',
      '--output',
      'json',
    ])
    expect(scope.isDone()).toBe(true)
  })

  it('handles convs with missing source field', async () => {
    nock(API)
      .get('/v2/conversations')
      .query(true)
      .reply(200, page([{ id: 1 }]))
    const stdout = await runCmd(ReportBeaconCommand, ['--output', 'json'])
    const rows = JSON.parse(stdout)
    expect(rows[0].type).toBe('unknown')
    expect(rows[0].via).toBe('unknown')
  })

  it('returns empty array when no convs', async () => {
    nock(API).get('/v2/conversations').query(true).reply(200, page([]))
    const stdout = await runCmd(ReportBeaconCommand, ['--output', 'json'])
    expect(JSON.parse(stdout)).toEqual([])
  })

  it('table output renders pct with % suffix via column getter', async () => {
    nock(API)
      .get('/v2/conversations')
      .query(true)
      .reply(
        200,
        page([
          { id: 1, source: { type: 'beacon', via: 'customer' } },
          { id: 2, source: { type: 'email', via: 'customer' } },
        ]),
      )
    const stdout = await runCmd(ReportBeaconCommand, ['--output', 'table'])
    expect(stdout).toMatch(/50%/)
  })
})
