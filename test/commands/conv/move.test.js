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

const { default: ConvMoveCommand } =
  await import('../../../src/commands/conv/move.js')

describe('hs conv move', () => {
  afterEach(() => nock.cleanAll())

  it('moves a conversation to another mailbox', async () => {
    const scope = nock('https://api.helpscout.net')
      .patch('/v2/conversations/123', (body) => {
        return (
          Array.isArray(body) &&
          body[0].op === 'replace' &&
          body[0].path === '/mailboxId' &&
          body[0].value === 456
        )
      })
      .reply(204)

    const stdout = await runCmd(ConvMoveCommand, [
      '123',
      '--to-mailbox', '456',
    ])

    expect(stdout).toContain('Conversation #123 moved to mailbox 456')
    expect(scope.isDone()).toBe(true)
  })

  it('sends JSON patch with correct content type', async () => {
    const scope = nock('https://api.helpscout.net')
      .patch('/v2/conversations/789', (body) => {
        return body[0].path === '/mailboxId' && body[0].value === 10
      })
      .reply(204)

    const stdout = await runCmd(ConvMoveCommand, [
      '789',
      '--to-mailbox', '10',
    ])

    expect(stdout).toContain('Conversation #789 moved to mailbox 10')
    expect(scope.isDone()).toBe(true)
  })
})
