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

const { default: ReportCompanyCommand } =
  await import('../../../src/commands/report/company.js')

describe('hs report company', () => {
  afterEach(() => nock.cleanAll())

  it('returns company report as JSON', async () => {
    const reportData = { totalConversations: 150, resolvedConversations: 120 }
    const scope = nock('https://api.helpscout.net')
      .get('/v2/reports/company')
      .query((q) => q.start === '2024-01-01T00:00:00Z' && q.end === '2024-01-31T23:59:59Z')
      .reply(200, reportData)

    const stdout = await runCmd(ReportCompanyCommand, [
      '--start', '2024-01-01T00:00:00Z',
      '--end', '2024-01-31T23:59:59Z',
    ])
    const output = JSON.parse(stdout)

    expect(output.totalConversations).toBe(150)
    expect(output.resolvedConversations).toBe(120)
    expect(scope.isDone()).toBe(true)
  })

  it('passes mailbox and tag query params', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/reports/company')
      .query((q) => q.mailboxes === '5' && q.tags === 'billing,vip')
      .reply(200, { totalConversations: 10 })

    const stdout = await runCmd(ReportCompanyCommand, [
      '--start', '2024-01-01T00:00:00Z',
      '--end', '2024-01-31T23:59:59Z',
      '--mailbox', '5',
      '--tag', 'billing,vip',
    ])
    const output = JSON.parse(stdout)

    expect(output.totalConversations).toBe(10)
    expect(scope.isDone()).toBe(true)
  })
})
