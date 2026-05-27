import nock from 'nock'
import { runCmd } from '../../helpers.js'

vi.mock('../../../src/lib/keychain.js', () => ({
  getTokens: vi.fn().mockResolvedValue({
    accessToken: 'test-token',
    refreshToken: 'r',
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

const { default: TagGetCommand } =
  await import('../../../src/commands/tag/get.js')

describe('hs tag get', () => {
  afterEach(() => nock.cleanAll())

  it('returns a single tag as JSON', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/tags/1')
      .reply(200, { id: 1, name: 'Billing', slug: 'billing', createdAt: '2024-01-01T00:00:00Z', ticketCount: 42 })

    const stdout = await runCmd(TagGetCommand, ['1', '--output', 'json'])
    const output = JSON.parse(stdout)

    expect(output[0].id).toBe(1)
    expect(output[0].name).toBe('Billing')
    expect(output[0].slug).toBe('billing')
    expect(output[0].ticketCount).toBe(42)
    expect(scope.isDone()).toBe(true)
  })

  it('renders tag details in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/tags/1')
      .reply(200, { id: 1, name: 'Billing', slug: 'billing', createdAt: '2024-01-01T00:00:00Z', ticketCount: 42 })

    const stdout = await runCmd(TagGetCommand, ['1', '--output', 'table'])

    expect(stdout).toContain('Billing')
    expect(stdout).toContain('billing')
    expect(scope.isDone()).toBe(true)
  })
})
