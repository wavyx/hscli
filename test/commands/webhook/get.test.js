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

const { default: WebhookGetCommand } =
  await import('../../../src/commands/webhook/get.js')

describe('hs webhook get', () => {
  afterEach(() => nock.cleanAll())

  it('returns a single webhook as JSON', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/webhooks/10')
      .reply(200, {
        id: 10,
        url: 'https://example.com/hook',
        events: ['convo.created'],
        state: 'enabled',
        secret: 's3cret',
        createdAt: '2024-01-01T00:00:00Z',
      })

    const stdout = await runCmd(WebhookGetCommand, ['10', '--output', 'json'])
    const output = JSON.parse(stdout)

    expect(output[0].id).toBe(10)
    expect(output[0].url).toBe('https://example.com/hook')
    expect(output[0].secret).toBe('s3cret')
    expect(scope.isDone()).toBe(true)
  })

  it('renders webhook details in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/webhooks/10')
      .reply(200, {
        id: 10,
        url: 'https://example.com/hook',
        events: ['convo.created', 'convo.deleted'],
        state: 'enabled',
        secret: 's3cret',
        createdAt: '2024-01-01T00:00:00Z',
      })

    const stdout = await runCmd(WebhookGetCommand, ['10', '--output', 'table'])

    expect(stdout).toContain('https://example.com/hook')
    expect(stdout).toContain('convo.created, convo.deleted')
    expect(scope.isDone()).toBe(true)
  })
})

it('handles webhook without events', async () => {
  nock('https://api.helpscout.net')
    .get('/v2/webhooks/1')
    .reply(200, { id: 1, url: 'http://x.com', state: 'enabled' })
  const stdout = await runCmd(WebhookGetCommand, ['1', '--output', 'table'])
  expect(stdout).toContain('http://x.com')
})
