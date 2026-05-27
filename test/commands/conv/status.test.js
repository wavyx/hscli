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

const { default: ConvStatusCommand } =
  await import('../../../src/commands/conv/status.js')

describe('hs conv status', () => {
  afterEach(() => nock.cleanAll())

  it('sets conversation status to closed', async () => {
    const scope = nock('https://api.helpscout.net')
      .patch('/v2/conversations/123', (body) => {
        return (
          Array.isArray(body) &&
          body[0].op === 'replace' &&
          body[0].path === '/status' &&
          body[0].value === 'closed'
        )
      })
      .reply(204)

    const stdout = await runCmd(ConvStatusCommand, [
      '123',
      '--set', 'closed',
    ])

    expect(stdout).toContain('Conversation #123 status')
    expect(stdout).toContain('closed')
    expect(scope.isDone()).toBe(true)
  })

  it('sets conversation status to pending', async () => {
    const scope = nock('https://api.helpscout.net')
      .patch('/v2/conversations/456', (body) => {
        return body[0].value === 'pending'
      })
      .reply(204)

    const stdout = await runCmd(ConvStatusCommand, [
      '456',
      '--set', 'pending',
    ])

    expect(stdout).toContain('Conversation #456 status')
    expect(stdout).toContain('pending')
    expect(scope.isDone()).toBe(true)
  })
})
