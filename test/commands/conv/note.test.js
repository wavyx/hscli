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

const { default: ConvNoteCommand } =
  await import('../../../src/commands/conv/note.js')

describe('hs conv note', () => {
  afterEach(() => nock.cleanAll())

  it('adds a note to a conversation', async () => {
    const scope = nock('https://api.helpscout.net')
      .post('/v2/conversations/123/notes', (body) => {
        return body.type === 'note' && body.text === 'Test body content'
      })
      .reply(201)

    const stdout = await runCmd(ConvNoteCommand, [
      '123',
      '--body', 'ignored by mock',
    ])

    expect(stdout).toContain('Added note to conversation #123')
    expect(scope.isDone()).toBe(true)
  })

  it('posts to the correct conversation endpoint', async () => {
    const scope = nock('https://api.helpscout.net')
      .post('/v2/conversations/456/notes')
      .reply(201)

    const stdout = await runCmd(ConvNoteCommand, [
      '456',
      '--body', 'text',
    ])

    expect(stdout).toContain('Added note to conversation #456')
    expect(scope.isDone()).toBe(true)
  })
})
