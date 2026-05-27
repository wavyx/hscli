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

const { default: CustomerSearchCommand } =
  await import('../../../src/commands/customer/search.js')

const fixture = {
  _embedded: {
    customers: [
      {
        id: 100,
        firstName: 'Alice',
        lastName: 'Wong',
        emails: [{ id: 1, value: 'alice@example.com' }],
        organization: 'Acme Corp',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
  },
  _links: { self: { href: '/v2/customers?page=1' } },
  page: { size: 25, totalElements: 1, totalPages: 1, number: 1 },
}

describe('hs customer search', () => {
  afterEach(() => nock.cleanAll())

  it('returns matching customers as JSON', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/customers')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(CustomerSearchCommand, [
      'alice',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(1)
    expect(output[0].firstName).toBe('Alice')
    expect(scope.isDone()).toBe(true)
  })

  it('passes query param to API', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/customers')
      .query((q) => q.query === 'acme')
      .reply(200, fixture)

    const stdout = await runCmd(CustomerSearchCommand, [
      'acme',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(1)
    expect(scope.isDone()).toBe(true)
  })

  it('renders table with email and company columns', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/customers')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(CustomerSearchCommand, [
      'alice',
      '--output',
      'table',
    ])

    expect(stdout).toContain('Alice')
    expect(stdout).toContain('alice@example.com')
    expect(stdout).toContain('Acme Corp')
    expect(scope.isDone()).toBe(true)
  })

  it('handles customers without email or organization', async () => {
    const sparse = {
      _embedded: {
        customers: [{ id: 2, firstName: 'Sparse', lastName: 'User' }],
      },
      page: { totalPages: 1 },
    }
    nock('https://api.helpscout.net')
      .get('/v2/customers')
      .query(true)
      .reply(200, sparse)

    const stdout = await runCmd(CustomerSearchCommand, [
      'sparse',
      '--output',
      'table',
    ])
    expect(stdout).toContain('Sparse')
  })
})
