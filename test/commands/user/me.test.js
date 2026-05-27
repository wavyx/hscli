import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(join(__dirname, '../../fixtures/users-me.json'), 'utf8'),
)

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

const { default: UserMeCommand } =
  await import('../../../src/commands/user/me.js')

describe('hs user me', () => {
  afterEach(() => nock.cleanAll())

  it('returns user data in JSON format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, fixture)

    const stdout = await runCmd(UserMeCommand, ['--output', 'json'])
    const output = JSON.parse(stdout)

    expect(output[0].id).toBe(12345)
    expect(output[0].email).toBe('jane@example.com')
    expect(output[0].firstName).toBe('Jane')
    expect(output[0].lastName).toBe('Doe')
    expect(output[0].role).toBe('owner')
    expect(scope.isDone()).toBe(true)
  })

  it('renders user info in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, fixture)

    const stdout = await runCmd(UserMeCommand, ['--output', 'table'])

    expect(stdout).toContain('Jane')
    expect(stdout).toContain('Doe')
    expect(stdout).toContain('jane@example.com')
    expect(stdout).toContain('owner')
    expect(scope.isDone()).toBe(true)
  })
})
