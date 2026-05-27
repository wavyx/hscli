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

const { default: CustomerListCommand } =
  await import('../../../src/commands/customer/list.js')

const fixture = {
  _embedded: {
    customers: [
      {
        id: 100, firstName: 'Alice', lastName: 'Wong',
        emails: [{ id: 1, value: 'alice@example.com' }],
        organization: 'Acme Corp',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 101, firstName: 'Bob', lastName: 'Jones',
        emails: [{ id: 2, value: 'bob@example.com' }],
        organization: null,
        createdAt: '2024-02-01T00:00:00Z',
      },
    ],
  },
  _links: { self: { href: '/v2/customers?page=1' } },
  page: { size: 25, totalElements: 2, totalPages: 1, number: 1 },
}

describe('hs customer list', () => {
  afterEach(() => nock.cleanAll())

  it('returns customers as JSON array', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/customers')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(CustomerListCommand, ['--output', 'json'])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output[0].firstName).toBe('Alice')
    expect(output[1].firstName).toBe('Bob')
    expect(scope.isDone()).toBe(true)
  })

  it('renders customers in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/customers')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(CustomerListCommand, ['--output', 'table'])

    expect(stdout).toContain('Alice')
    expect(stdout).toContain('Wong')
    expect(stdout).toContain('alice@example.com')
    expect(stdout).toContain('Acme Corp')
    expect(scope.isDone()).toBe(true)
  })
})
