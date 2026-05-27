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

const { default: ConvThreadsCommand } = await import(
  '../../../src/commands/conv/threads.js'
)

describe('hs conv threads', () => {
  afterEach(() => nock.cleanAll())

  it('lists threads for a conversation', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/100/threads')
      .reply(200, {
        _embedded: {
          threads: [
            { id: 1, type: 'note', body: 'Internal note', createdAt: '2024-01-01T00:00:00Z' },
            { id: 2, type: 'customer', body: 'Customer message', createdAt: '2024-01-02T00:00:00Z' },
          ],
        },
      })

    const stdout = await runCmd(ConvThreadsCommand, ['100', '--output', 'json'])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(output[0].type).toBe('note')
    expect(output[1].type).toBe('customer')
    expect(scope.isDone()).toBe(true)
  })

  it('renders threads in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/100/threads')
      .reply(200, {
        _embedded: {
          threads: [
            { id: 1, type: 'note', body: 'My note', createdAt: '2024-01-01T00:00:00Z' },
          ],
        },
      })

    const stdout = await runCmd(ConvThreadsCommand, ['100', '--output', 'table'])

    expect(stdout).toContain('note')
    expect(stdout).toContain('My note')
    expect(scope.isDone()).toBe(true)
  })
})
