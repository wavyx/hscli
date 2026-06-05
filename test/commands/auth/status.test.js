import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const userFixture = JSON.parse(
  readFileSync(join(__dirname, '../../fixtures/users-me.json'), 'utf8'),
)

const mockGetTokens = vi.fn()

vi.mock('../../../src/lib/keychain.js', () => ({
  getTokens: mockGetTokens,
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

// auth:status has skipAuth=true, so it doesn't call getValidToken,
// but it does call getTokens directly from keychain.js and uses
// native fetch for user info.

const { default: StatusCommand } =
  await import('../../../src/commands/auth/status.js')

describe('hs auth status', () => {
  afterEach(() => nock.cleanAll())

  it('shows authenticated status with user info', async () => {
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 86400000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    const scope = nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, userFixture)

    const stdout = await runCmd(StatusCommand)

    expect(stdout).toContain('Profile')
    expect(stdout).toContain('default')
    expect(stdout).toContain('Valid')
    expect(stdout).toContain('authorization_code')
    expect(stdout).toContain('Jane Doe')
    expect(stdout).toContain('jane@example.com')
    expect(scope.isDone()).toBe(true)
  })

  it('emits structured JSON with --output json', async () => {
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 86400000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })
    const scope = nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, userFixture)

    const out = JSON.parse(await runCmd(StatusCommand, ['--output', 'json']))

    expect(out.profile).toBe('default')
    expect(out.authenticated).toBe(true)
    expect(out.token.state).toBe('valid')
    expect(out.user.email).toBe('jane@example.com')
    expect(scope.isDone()).toBe(true)
  })

  it('emits JSON for an unauthenticated profile', async () => {
    mockGetTokens.mockResolvedValue(null)
    const out = JSON.parse(await runCmd(StatusCommand, ['--output', 'json']))
    expect(out.authenticated).toBe(false)
    expect(out.token).toBeUndefined()
  })

  it('shows not authenticated when no tokens exist', async () => {
    mockGetTokens.mockResolvedValue(null)

    const stdout = await runCmd(StatusCommand)

    expect(stdout).toContain('Not authenticated')
    expect(stdout).toContain('hscli auth login')
  })

  it('shows expired token status', async () => {
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() - 1000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    const stdout = await runCmd(StatusCommand)

    expect(stdout).toContain('Expired')
  })

  it('silently ignores network errors when fetching user info', async () => {
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 86400000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    const scope = nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .replyWithError('connection refused')

    const stdout = await runCmd(StatusCommand)

    // Should still show basic status without user info
    expect(stdout).toContain('Valid')
    expect(stdout).toContain('authorization_code')
    expect(stdout).not.toContain('Authenticated User')
    expect(scope.isDone()).toBe(true)
  })

  it('handles non-ok response from user info endpoint', async () => {
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 86400000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    const scope = nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(403, { error: 'forbidden' })

    const stdout = await runCmd(StatusCommand)

    // Should still show valid token status but no user info
    expect(stdout).toContain('Valid')
    expect(stdout).not.toContain('Authenticated User')
    expect(scope.isDone()).toBe(true)
  })

  it('formats duration in minutes when under 1 hour', async () => {
    // Set token to expire in 45 minutes
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 45 * 60 * 1000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    const scope = nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, userFixture)

    const stdout = await runCmd(StatusCommand)

    // Should show "Xm" format (minutes only, no hours/days)
    expect(stdout).toMatch(/expires in \d+m\)/)
    expect(scope.isDone()).toBe(true)
  })

  it('formats duration in seconds when under 1 minute', async () => {
    // Set token to expire in 30 seconds
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 30 * 1000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    const scope = nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, userFixture)

    const stdout = await runCmd(StatusCommand)

    // Should show "Xs" format (seconds only)
    expect(stdout).toMatch(/expires in \d+s\)/)
    expect(scope.isDone()).toBe(true)
  })

  it('formats duration in hours when under 1 day', async () => {
    // Set token to expire in 5 hours
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 5 * 60 * 60 * 1000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    const scope = nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, userFixture)

    const stdout = await runCmd(StatusCommand)

    // Should show "Xh Ym" format
    expect(stdout).toMatch(/expires in \d+h \d+m\)/)
    expect(scope.isDone()).toBe(true)
  })

  it('formats duration in days when over 1 day', async () => {
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      expiresAt: Date.now() + 3 * 86400000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, userFixture)

    const stdout = await runCmd(StatusCommand)
    expect(stdout).toMatch(/\dd \d+h/)
  })

  it('reports keychain unavailable when no OS keychain is present', async () => {
    const { isKeychainAvailable } = await import('../../../src/lib/keychain.js')
    isKeychainAvailable.mockReturnValueOnce(false)
    mockGetTokens.mockResolvedValue(null)

    const stdout = await runCmd(StatusCommand)

    expect(stdout).toContain('unavailable')
  })

  it('displays user info without name when only email is available', async () => {
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 86400000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    const scope = nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, { id: 1, email: 'noname@example.com' })

    const stdout = await runCmd(StatusCommand)

    expect(stdout).toContain('Authenticated User')
    expect(stdout).toContain('noname@example.com')
    expect(stdout).not.toContain('Name')
    expect(scope.isDone()).toBe(true)
  })

  it('displays user info without email when only name is available', async () => {
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 86400000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    const scope = nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, { id: 1, firstName: 'Solo', lastName: 'Name' })

    const stdout = await runCmd(StatusCommand)

    expect(stdout).toContain('Authenticated User')
    expect(stdout).toContain('Solo Name')
    expect(stdout).not.toContain('Email')
    expect(scope.isDone()).toBe(true)
  })
})
