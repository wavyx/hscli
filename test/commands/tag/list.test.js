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

const { default: TagListCommand } =
  await import('../../../src/commands/tag/list.js')

const fixture = {
  _embedded: {
    tags: [
      { id: 1, name: 'Billing', slug: 'billing', createdAt: '2024-01-01T00:00:00Z', ticketCount: 42 },
      { id: 2, name: 'Feature Request', slug: 'feature-request', createdAt: '2024-02-01T00:00:00Z', ticketCount: 15 },
    ],
  },
  _links: { self: { href: '/v2/tags?page=1' } },
  page: { size: 50, totalElements: 2, totalPages: 1, number: 1 },
}

describe('hs tag list', () => {
  afterEach(() => nock.cleanAll())

  it('returns tags as JSON array', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/tags')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(TagListCommand, ['--output', 'json'])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output[0].name).toBe('Billing')
    expect(output[1].name).toBe('Feature Request')
    expect(scope.isDone()).toBe(true)
  })

  it('renders tags in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/tags')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(TagListCommand, ['--output', 'table'])

    expect(stdout).toContain('Billing')
    expect(stdout).toContain('Feature Request')
    expect(stdout).toContain('billing')
    expect(stdout).toContain('feature-request')
    expect(scope.isDone()).toBe(true)
  })
})
