import nock from 'nock'
import { runCmd } from '../../helpers.js'

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

const { default: ReportUserCommand } =
  await import('../../../src/commands/report/user.js')

describe('hs report user', () => {
  afterEach(() => nock.cleanAll())

  it('returns user report as JSON', async () => {
    const reportData = { conversationsHandled: 45, avgResponseTime: 3600 }
    const scope = nock('https://api.helpscout.net')
      .get('/v2/reports/user')
      .query(
        (q) =>
          q.start === '2024-01-01T00:00:00Z' &&
          q.end === '2024-01-31T23:59:59Z' &&
          q.user === '10',
      )
      .reply(200, reportData)

    const stdout = await runCmd(ReportUserCommand, [
      '--start',
      '2024-01-01T00:00:00Z',
      '--end',
      '2024-01-31T23:59:59Z',
      '--user',
      '10',
    ])
    const output = JSON.parse(stdout)

    expect(output.conversationsHandled).toBe(45)
    expect(output.avgResponseTime).toBe(3600)
    expect(scope.isDone()).toBe(true)
  })

  it('passes all query params to API', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/reports/user')
      .query((q) => q.user === '99' && q.start && q.end)
      .reply(200, { conversationsHandled: 0 })

    const stdout = await runCmd(ReportUserCommand, [
      '--start',
      '2024-06-01T00:00:00Z',
      '--end',
      '2024-06-30T23:59:59Z',
      '--user',
      '99',
    ])
    const output = JSON.parse(stdout)

    expect(output.conversationsHandled).toBe(0)
    expect(scope.isDone()).toBe(true)
  })
})
