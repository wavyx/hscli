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

const { default: ConvCountCommand } =
  await import('../../../src/commands/conv/count.js')

const fixture = {
  _embedded: {
    conversations: [{ id: 100, subject: 'Test', status: 'active' }],
  },
  page: { size: 25, totalElements: 47, totalPages: 2, number: 1 },
}

describe('hs conv count', () => {
  afterEach(() => nock.cleanAll())

  it('outputs the total count number', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(ConvCountCommand, [])

    expect(stdout).toContain('47')
    expect(scope.isDone()).toBe(true)
  })

  it('outputs JSON format with count field', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(ConvCountCommand, ['--output', 'json'])
    const output = JSON.parse(stdout)

    expect(output.count).toBe(47)
    expect(scope.isDone()).toBe(true)
  })

  it('passes status filter to API', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => q.status === 'closed')
      .reply(200, fixture)

    const stdout = await runCmd(ConvCountCommand, ['--status', 'closed'])

    expect(stdout).toContain('47')
    expect(scope.isDone()).toBe(true)
  })
})
