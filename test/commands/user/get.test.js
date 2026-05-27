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

const { default: UserGetCommand } =
  await import('../../../src/commands/user/get.js')

describe('hs user get', () => {
  afterEach(() => nock.cleanAll())

  it('returns a single user as JSON', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/users/1')
      .reply(200, {
        id: 1, firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com',
        role: 'owner', timezone: 'America/New_York', createdAt: '2024-01-01T00:00:00Z',
      })

    const stdout = await runCmd(UserGetCommand, ['1', '--output', 'json'])
    const output = JSON.parse(stdout)

    expect(output[0].id).toBe(1)
    expect(output[0].firstName).toBe('Jane')
    expect(output[0].email).toBe('jane@example.com')
    expect(output[0].timezone).toBe('America/New_York')
    expect(scope.isDone()).toBe(true)
  })

  it('renders user details in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/users/1')
      .reply(200, {
        id: 1, firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com',
        role: 'owner', timezone: 'America/New_York', createdAt: '2024-01-01T00:00:00Z',
      })

    const stdout = await runCmd(UserGetCommand, ['1', '--output', 'table'])

    expect(stdout).toContain('Jane')
    expect(stdout).toContain('Doe')
    expect(stdout).toContain('jane@example.com')
    expect(stdout).toContain('America/New_York')
    expect(scope.isDone()).toBe(true)
  })
})
