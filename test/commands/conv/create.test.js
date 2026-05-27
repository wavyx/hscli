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

vi.mock('../../../src/lib/body.js', () => ({
  resolveBody: vi.fn().mockResolvedValue('Test body content'),
}))

const { default: ConvCreateCommand } =
  await import('../../../src/commands/conv/create.js')

describe('hs conv create', () => {
  afterEach(() => nock.cleanAll())

  it('creates a conversation and logs the ID', async () => {
    const scope = nock('https://api.helpscout.net')
      .post('/v2/conversations', (body) => {
        return (
          body.subject === 'Help needed' &&
          body.type === 'email' &&
          body.mailboxId === 1 &&
          body.customer.email === 'user@example.com' &&
          body.threads[0].type === 'customer' &&
          body.threads[0].text === 'Test body content' &&
          body.status === 'active'
        )
      })
      .reply(201, { id: 999 })

    const stdout = await runCmd(ConvCreateCommand, [
      '--mailbox',
      '1',
      '--customer',
      'user@example.com',
      '--subject',
      'Help needed',
      '--body',
      'ignored by mock',
    ])

    expect(stdout).toContain('Created conversation 999')
    expect(scope.isDone()).toBe(true)
  })

  it('includes tags and assignTo when provided', async () => {
    const scope = nock('https://api.helpscout.net')
      .post('/v2/conversations', (body) => {
        return (
          body.tags.length === 2 &&
          body.tags[0] === 'billing' &&
          body.tags[1] === 'urgent' &&
          body.assignTo === 42
        )
      })
      .reply(201, { id: 1000 })

    const stdout = await runCmd(ConvCreateCommand, [
      '--mailbox',
      '1',
      '--customer',
      'user@example.com',
      '--subject',
      'Tagged',
      '--body',
      'text',
      '--tag',
      'billing,urgent',
      '--assign-to',
      '42',
    ])

    expect(stdout).toContain('Created conversation 1000')
    expect(scope.isDone()).toBe(true)
  })

  it('supports chat conversation type', async () => {
    const scope = nock('https://api.helpscout.net')
      .post('/v2/conversations', (body) => body.type === 'chat')
      .reply(201, { id: 1001 })

    const stdout = await runCmd(ConvCreateCommand, [
      '--mailbox',
      '1',
      '--customer',
      'user@example.com',
      '--subject',
      'Chat conv',
      '--body',
      'text',
      '--type',
      'chat',
    ])

    expect(stdout).toContain('Created conversation 1001')
    expect(scope.isDone()).toBe(true)
  })
})
