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

const { default: TagUsageCommand } =
  await import('../../../src/commands/tag/usage.js')

const fixture = {
  _embedded: {
    tags: [
      {
        id: 1,
        name: 'Billing',
        slug: 'billing',
        createdAt: '2024-01-01T00:00:00Z',
        ticketCount: 42,
      },
      {
        id: 2,
        name: 'Feature Request',
        slug: 'feature-request',
        createdAt: '2024-02-01T00:00:00Z',
        ticketCount: 15,
      },
    ],
  },
  _links: { self: { href: '/v2/tags?page=1' } },
  page: { size: 50, totalElements: 2, totalPages: 1, number: 1 },
}

describe('hs tag usage', () => {
  afterEach(() => nock.cleanAll())

  it('outputs tag name and count', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/tags')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(TagUsageCommand, ['Billing'])

    expect(stdout).toContain('Billing')
    expect(stdout).toContain('42')
    expect(scope.isDone()).toBe(true)
  })

  it('outputs JSON format with name and count', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/tags')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(TagUsageCommand, [
      'Billing',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output.name).toBe('Billing')
    expect(output.count).toBe(42)
    expect(scope.isDone()).toBe(true)
  })

  it('reports error when tag is not found', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/tags')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(TagUsageCommand, ['nonexistent'])

    expect(stdout).toContain('Tag not found: nonexistent')
    expect(scope.isDone()).toBe(true)
  })
})
