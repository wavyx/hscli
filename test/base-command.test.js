import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import nock from 'nock'

const mockGetValidToken = vi.fn()
const mockResolveCredentials = vi.fn()
const mockRefreshAccessToken = vi.fn()
const mockGetTokens = vi.fn()
const mockSetTokens = vi.fn()
const mockLoadConfig = vi.fn()

vi.mock('../src/lib/keychain.js', () => ({
  getTokens: mockGetTokens,
  setTokens: mockSetTokens,
  deleteTokens: vi.fn().mockResolvedValue(undefined),
  isKeychainAvailable: vi.fn().mockReturnValue(true),
}))

vi.mock('../src/lib/config.js', () => ({
  loadConfig: mockLoadConfig,
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

vi.mock('../src/lib/auth.js', () => ({
  getValidToken: mockGetValidToken,
  resolveCredentials: mockResolveCredentials,
  refreshAccessToken: mockRefreshAccessToken,
}))

const { default: UserMeCommand } = await import('../src/commands/user/me.js')
const { default: ProfileCurrentCommand } =
  await import('../src/commands/profile/current.js')

function captureLogs(CmdClass, argv = []) {
  const lines = []
  const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
    lines.push(args.map(String).join(' '))
  })
  return CmdClass.run(argv)
    .then(() => lines.join('\n'))
    .catch((err) => {
      spy.mockRestore()
      throw err
    })
    .finally(() => spy.mockRestore())
}

describe('BaseCommand', () => {
  beforeEach(() => {
    mockLoadConfig.mockReturnValue({ activeProfile: 'default' })
    mockGetValidToken.mockReset()
    mockResolveCredentials.mockReset()
    mockRefreshAccessToken.mockReset()
    mockGetTokens.mockReset()
    mockSetTokens.mockReset()
  })

  afterEach(() => {
    nock.cleanAll()
    delete process.env.FORCE_COLOR
    delete process.env.NO_COLOR
    delete process.env.DEBUG
  })

  it('sets DEBUG=hs:* when --verbose flag is passed', async () => {
    await captureLogs(ProfileCurrentCommand, ['--verbose'])
    expect(process.env.DEBUG).toContain('hs:')
  })

  it('appends hs:* to existing DEBUG when --verbose flag is passed', async () => {
    process.env.DEBUG = 'other:*'
    await captureLogs(ProfileCurrentCommand, ['--verbose'])
    expect(process.env.DEBUG).toContain('other:*')
    expect(process.env.DEBUG).toContain('hs:*')
  })

  it('sets FORCE_COLOR=0 when --no-color flag is passed', async () => {
    await captureLogs(ProfileCurrentCommand, ['--no-color'])
    expect(process.env.FORCE_COLOR).toBe('0')
  })

  it('sets FORCE_COLOR=0 when NO_COLOR env is set', async () => {
    process.env.NO_COLOR = '1'
    await captureLogs(ProfileCurrentCommand)
    expect(process.env.FORCE_COLOR).toBe('0')
  })

  it('skips auth when skipAuth is true', async () => {
    const stdout = await captureLogs(ProfileCurrentCommand)
    expect(mockGetValidToken).not.toHaveBeenCalled()
    expect(stdout).toContain('default')
  })

  it('throws AuthRequiredError when no valid token', async () => {
    mockGetValidToken.mockResolvedValue(null)
    await expect(captureLogs(UserMeCommand)).rejects.toThrow(
      'Not authenticated',
    )
  })

  it('defaults to json output when not TTY', async () => {
    mockGetValidToken.mockResolvedValue('valid-token')
    mockResolveCredentials.mockReturnValue({
      clientId: 'cid',
      clientSecret: 'csec',
      source: 'profile',
    })

    nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, { id: 1, firstName: 'Json', lastName: 'User' })

    const origIsTTY = process.stdout.isTTY
    process.stdout.isTTY = false
    const stdout = await captureLogs(UserMeCommand)
    process.stdout.isTTY = origIsTTY

    expect(stdout).toContain('"firstName": "Json"')
  })

  it('defaults to table output when TTY', async () => {
    mockGetValidToken.mockResolvedValue('valid-token')
    mockResolveCredentials.mockReturnValue({
      clientId: 'cid',
      clientSecret: 'csec',
      source: 'profile',
    })

    nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, { id: 1, firstName: 'TTY', lastName: 'User' })

    const origIsTTY = process.stdout.isTTY
    process.stdout.isTTY = true
    const stdout = await captureLogs(UserMeCommand)
    process.stdout.isTTY = origIsTTY

    // Table output uses cli-table3 borders
    expect(stdout).toContain('TTY')
    expect(stdout).toContain('│')
  })

  it('creates apiClient when authenticated', async () => {
    mockGetValidToken.mockResolvedValue('valid-token')
    mockResolveCredentials.mockReturnValue({
      clientId: 'cid',
      clientSecret: 'csec',
      source: 'profile',
    })

    nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, { id: 1, firstName: 'Test', lastName: 'User' })

    const stdout = await captureLogs(UserMeCommand, ['--output', 'json'])
    expect(stdout).toContain('Test')
  })

  it('onRefresh callback refreshes token on 401', async () => {
    mockGetValidToken.mockResolvedValue('valid-token')
    mockResolveCredentials.mockReturnValue({
      clientId: 'cid',
      clientSecret: 'csec',
      source: 'profile',
    })
    mockGetTokens.mockResolvedValue({
      accessToken: 'old-token',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() + 86400000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })
    mockRefreshAccessToken.mockResolvedValue({
      accessToken: 'new-token',
      refreshToken: 'new-refresh',
      expiresIn: 172800,
    })
    mockSetTokens.mockResolvedValue(undefined)

    nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(401, { message: 'expired' })
      .get('/v2/users/me')
      .reply(200, { id: 1, firstName: 'Refreshed', lastName: 'User' })

    const stdout = await captureLogs(UserMeCommand, ['--output', 'json'])

    expect(mockRefreshAccessToken).toHaveBeenCalledWith({
      refreshToken: 'old-refresh',
      clientId: 'cid',
      clientSecret: 'csec',
    })
    expect(mockSetTokens).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
      }),
    )
    expect(stdout).toContain('Refreshed')
  })

  it('onRefresh throws when no refresh token', async () => {
    mockGetValidToken.mockResolvedValue('valid-token')
    mockResolveCredentials.mockReturnValue({
      clientId: 'cid',
      clientSecret: 'csec',
      source: 'profile',
    })
    mockGetTokens.mockResolvedValue({
      accessToken: 'old-token',
      expiresAt: Date.now() + 86400000,
      authMode: 'client_credentials',
    })

    nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(401, { message: 'expired' })

    await expect(captureLogs(UserMeCommand)).rejects.toThrow(
      'Not authenticated',
    )
  })

  it('onRefresh throws when getTokens returns null', async () => {
    mockGetValidToken.mockResolvedValue('valid-token')
    mockResolveCredentials.mockReturnValue({
      clientId: 'cid',
      clientSecret: 'csec',
      source: 'profile',
    })
    mockGetTokens.mockResolvedValue(null)

    nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(401, { message: 'expired' })

    await expect(captureLogs(UserMeCommand)).rejects.toThrow(
      'Not authenticated',
    )
  })

  it('catch delegates to handleError', async () => {
    mockGetValidToken.mockResolvedValue('valid-token')
    mockResolveCredentials.mockReturnValue({
      clientId: 'cid',
      clientSecret: 'csec',
      source: 'profile',
    })

    nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(422, { message: 'Validation failed' })

    await expect(captureLogs(UserMeCommand)).rejects.toThrow(
      'Help Scout API 422: Validation failed',
    )
  })

  it('--jq filters output through jq expression', async () => {
    mockGetValidToken.mockResolvedValue('valid-token')
    mockResolveCredentials.mockReturnValue({
      clientId: 'cid',
      clientSecret: 'csec',
      source: 'profile',
    })

    nock('https://api.helpscout.net')
      .get('/v2/users/me')
      .reply(200, { id: 1, firstName: 'Jq', lastName: 'Test' })

    const stdout = await captureLogs(UserMeCommand, ['--jq', '.[0].firstName'])
    expect(stdout).toContain('Jq')
  })

  it('--fields limits displayed columns', async () => {
    mockGetValidToken.mockResolvedValue('valid-token')
    mockResolveCredentials.mockReturnValue({
      clientId: 'cid',
      clientSecret: 'csec',
      source: 'profile',
    })

    nock('https://api.helpscout.net').get('/v2/users/me').reply(200, {
      id: 1,
      firstName: 'Field',
      lastName: 'Test',
      email: 'f@t.com',
    })

    const origIsTTY = process.stdout.isTTY
    process.stdout.isTTY = true
    const stdout = await captureLogs(UserMeCommand, ['--fields', 'id,email'])
    process.stdout.isTTY = origIsTTY

    expect(stdout).toContain('ID')
    expect(stdout).toContain('f@t.com')
    expect(stdout).not.toContain('First Name')
  })
})
