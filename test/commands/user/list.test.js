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

const { default: UserListCommand } =
  await import('../../../src/commands/user/list.js')

const fixture = {
  _embedded: {
    users: [
      { id: 1, firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', role: 'owner', createdAt: '2024-01-01T00:00:00Z' },
      { id: 2, firstName: 'John', lastName: 'Smith', email: 'john@example.com', role: 'user', createdAt: '2024-02-01T00:00:00Z' },
    ],
  },
  _links: { self: { href: '/v2/users?page=1' } },
  page: { size: 50, totalElements: 2, totalPages: 1, number: 1 },
}

describe('hs user list', () => {
  afterEach(() => nock.cleanAll())

  it('returns users as JSON array', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/users')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(UserListCommand, ['--output', 'json'])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output[0].firstName).toBe('Jane')
    expect(output[1].firstName).toBe('John')
    expect(scope.isDone()).toBe(true)
  })

  it('renders users in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/users')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(UserListCommand, ['--output', 'table'])

    expect(stdout).toContain('Jane')
    expect(stdout).toContain('Doe')
    expect(stdout).toContain('jane@example.com')
    expect(stdout).toContain('John')
    expect(stdout).toContain('Smith')
    expect(scope.isDone()).toBe(true)
  })
})
