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

const { default: ConvAssignCommand } =
  await import('../../../src/commands/conv/assign.js')

describe('hs conv assign', () => {
  afterEach(() => nock.cleanAll())

  it('assigns a conversation to a user by ID', async () => {
    const scope = nock('https://api.helpscout.net')
      .patch('/v2/conversations/123', (body) => {
        return (
          Array.isArray(body) &&
          body[0].op === 'replace' &&
          body[0].path === '/assignTo' &&
          body[0].value === 456
        )
      })
      .reply(204)

    const stdout = await runCmd(ConvAssignCommand, [
      '123',
      '--user', '456',
    ])

    expect(stdout).toContain('Conversation #123 assigned to user 456')
    expect(scope.isDone()).toBe(true)
  })

  it('resolves "me" to the authenticated user ID', async () => {
    const meScope = nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, { id: 789, firstName: 'Test', lastName: 'User' })

    const patchScope = nock('https://api.helpscout.net')
      .patch('/v2/conversations/100', (body) => {
        return body[0].value === 789
      })
      .reply(204)

    const stdout = await runCmd(ConvAssignCommand, [
      '100',
      '--user', 'me',
    ])

    expect(stdout).toContain('Conversation #100 assigned to user 789')
    expect(meScope.isDone()).toBe(true)
    expect(patchScope.isDone()).toBe(true)
  })
})
