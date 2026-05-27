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

const { default: ConvReplyCommand } =
  await import('../../../src/commands/conv/reply.js')

describe('hs conv reply', () => {
  afterEach(() => nock.cleanAll())

  it('replies to a conversation', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/123')
      .reply(200, { primaryCustomer: { id: 42 } })
      .post('/v2/conversations/123/reply', (body) => {
        return (
          body.type === 'reply' &&
          body.text === 'Test body content' &&
          body.draft === false &&
          body.customer.id === 42
        )
      })
      .reply(201)

    const stdout = await runCmd(ConvReplyCommand, [
      '123',
      '--body',
      'ignored by mock',
    ])

    expect(stdout).toContain('Replied to conversation #123')
    expect(scope.isDone()).toBe(true)
  })

  it('includes cc and bcc when provided', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/200')
      .reply(200, { primaryCustomer: { id: 42 } })
      .post('/v2/conversations/200/reply', (body) => {
        return (
          body.cc.length === 2 &&
          body.cc[0] === 'a@example.com' &&
          body.cc[1] === 'b@example.com' &&
          body.bcc.length === 1 &&
          body.bcc[0] === 'c@example.com'
        )
      })
      .reply(201)

    const stdout = await runCmd(ConvReplyCommand, [
      '200',
      '--body',
      'text',
      '--cc',
      'a@example.com,b@example.com',
      '--bcc',
      'c@example.com',
    ])

    expect(stdout).toContain('Replied to conversation #200')
    expect(scope.isDone()).toBe(true)
  })

  it('falls back to createdBy when primaryCustomer missing', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/400')
      .reply(200, { createdBy: { id: 99 } })
      .post('/v2/conversations/400/reply', (body) => body.customer.id === 99)
      .reply(201)

    const stdout = await runCmd(ConvReplyCommand, ['400', '--body', 'text'])

    expect(stdout).toContain('Replied to conversation #400')
    expect(scope.isDone()).toBe(true)
  })

  it('supports draft flag', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/300')
      .reply(200, { primaryCustomer: { id: 42 } })
      .post('/v2/conversations/300/reply', (body) => body.draft === true)
      .reply(201)

    const stdout = await runCmd(ConvReplyCommand, [
      '300',
      '--body',
      'text',
      '--draft',
    ])

    expect(stdout).toContain('Replied to conversation #300')
    expect(scope.isDone()).toBe(true)
  })
})
