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
  resolveBody: vi.fn().mockResolvedValue('Updated note content'),
}))

const { default: ConvEditNoteCommand } = await import(
  '../../../src/commands/conv/edit-note.js'
)

describe('hs conv edit-note', () => {
  afterEach(() => nock.cleanAll())

  it('edits a thread body via JSON Patch', async () => {
    const scope = nock('https://api.helpscout.net')
      .patch('/v2/conversations/100/threads/456', (body) => {
        return (
          body.op === 'replace' &&
          body.path === '/text' &&
          body.value === 'Updated note content'
        )
      })
      .matchHeader('content-type', 'application/json-patch+json')
      .reply(204)

    const stdout = await runCmd(ConvEditNoteCommand, [
      '100',
      '456',
      '--body',
      'ignored by mock',
    ])

    expect(stdout).toContain('Updated thread 456')
    expect(scope.isDone()).toBe(true)
  })
})
