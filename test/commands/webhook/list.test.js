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

const { default: WebhookListCommand } =
  await import('../../../src/commands/webhook/list.js')

const fixture = {
  _embedded: {
    webhooks: [
      {
        id: 1,
        url: 'https://example.com/hook1',
        events: ['convo.created', 'convo.updated'],
        state: 'enabled',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        url: 'https://example.com/hook2',
        events: ['convo.deleted'],
        state: 'disabled',
        createdAt: '2024-02-01T00:00:00Z',
      },
    ],
  },
  _links: { self: { href: '/v2/webhooks?page=1' } },
  page: { size: 50, totalElements: 2, totalPages: 1, number: 1 },
}

describe('hs webhook list', () => {
  afterEach(() => nock.cleanAll())

  it('returns webhooks as JSON array', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/webhooks')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(WebhookListCommand, ['--output', 'json'])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output[0].url).toBe('https://example.com/hook1')
    expect(scope.isDone()).toBe(true)
  })

  it('renders webhooks in table format with joined events', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/webhooks')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(WebhookListCommand, ['--output', 'table'])

    expect(stdout).toContain('https://example.com/hook1')
    expect(stdout).toContain('convo.created, convo.updated')
    expect(scope.isDone()).toBe(true)
  })
})
