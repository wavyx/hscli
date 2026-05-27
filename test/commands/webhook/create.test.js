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

const { default: WebhookCreateCommand } =
  await import('../../../src/commands/webhook/create.js')

describe('hs webhook create', () => {
  afterEach(() => nock.cleanAll())

  it('creates a webhook and logs the ID', async () => {
    const scope = nock('https://api.helpscout.net')
      .post('/v2/webhooks', (body) => {
        return (
          body.url === 'https://example.com/hook' &&
          body.events.length === 2 &&
          body.events[0] === 'convo.created' &&
          body.events[1] === 'convo.updated' &&
          body.secret === 's3cret'
        )
      })
      .reply(201, { id: 55 })

    const stdout = await runCmd(WebhookCreateCommand, [
      '--url', 'https://example.com/hook',
      '--event', 'convo.created, convo.updated',
      '--secret', 's3cret',
    ])

    expect(stdout).toContain('Created webhook 55')
    expect(scope.isDone()).toBe(true)
  })

  it('includes label when provided', async () => {
    const scope = nock('https://api.helpscout.net')
      .post('/v2/webhooks', (body) => {
        return body.label === 'My Hook' && body.url === 'https://example.com/hook'
      })
      .reply(201, { id: 56 })

    const stdout = await runCmd(WebhookCreateCommand, [
      '--url', 'https://example.com/hook',
      '--event', 'convo.created',
      '--secret', 's3cret',
      '--label', 'My Hook',
    ])

    expect(stdout).toContain('Created webhook 56')
    expect(scope.isDone()).toBe(true)
  })
})
