import nock from 'nock'
import { runCmd } from '../helpers.js'

const mockGetTokens = vi.fn()
const mockIsKeychainAvailable = vi.fn()
const mockGetActiveProfile = vi.fn()
const mockGetConf = vi.fn()

vi.mock('../../src/lib/keychain.js', () => ({
  getTokens: mockGetTokens,
  setTokens: vi.fn().mockResolvedValue(undefined),
  deleteTokens: vi.fn().mockResolvedValue(undefined),
  isKeychainAvailable: mockIsKeychainAvailable,
}))

vi.mock('../../src/lib/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({ activeProfile: 'default' }),
  getActiveProfile: mockGetActiveProfile,
  setActiveProfile: vi.fn(),
  getConf: mockGetConf,
  getProfileConfig: vi.fn().mockReturnValue(undefined),
  setProfileConfig: vi.fn(),
  getProfileData: vi.fn().mockReturnValue({}),
  getAllProfiles: vi.fn().mockReturnValue({ default: {} }),
  deleteProfileConfig: vi.fn(),
}))

const { default: DoctorCommand } = await import('../../src/commands/doctor.js')

describe('hs doctor', () => {
  afterEach(() => nock.cleanAll())

  it('reports all checks passing when environment is healthy', async () => {
    mockGetConf.mockReturnValue({
      get: vi.fn().mockReturnValue('default'),
      set: vi.fn(),
      path: '/tmp/test-config',
    })
    mockIsKeychainAvailable.mockReturnValue(true)
    mockGetActiveProfile.mockReturnValue('default')
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 86400000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    // Mock the API reachability check
    const scope = nock('https://api.helpscout.net').get('/v2').reply(200, {})

    const stdout = await runCmd(DoctorCommand)

    expect(stdout).toContain('Config directory accessible')
    expect(stdout).toContain('Keychain available')
    expect(stdout).toContain('Active profile set')
    expect(stdout).toContain('Tokens present')
    expect(stdout).toContain('Token not expired')
    expect(stdout).toContain('API reachable')
    expect(stdout).toContain('All checks passed')
    expect(scope.isDone()).toBe(true)
  })

  it('reports failures when tokens are missing', async () => {
    mockGetConf.mockReturnValue({
      get: vi.fn().mockReturnValue('default'),
      set: vi.fn(),
      path: '/tmp/test-config',
    })
    mockIsKeychainAvailable.mockReturnValue(true)
    mockGetActiveProfile.mockReturnValue('default')
    mockGetTokens.mockResolvedValue(null)

    const scope = nock('https://api.helpscout.net').get('/v2').reply(200, {})

    const stdout = await runCmd(DoctorCommand)

    expect(stdout).toContain('Config directory accessible')
    expect(stdout).toContain('Tokens present')
    expect(stdout).toContain('failed')
    expect(scope.isDone()).toBe(true)
  })

  it('reports expired token', async () => {
    mockGetConf.mockReturnValue({
      get: vi.fn().mockReturnValue('default'),
      set: vi.fn(),
      path: '/tmp/test-config',
    })
    mockIsKeychainAvailable.mockReturnValue(true)
    mockGetActiveProfile.mockReturnValue('default')
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() - 1000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    const scope = nock('https://api.helpscout.net').get('/v2').reply(200, {})

    const stdout = await runCmd(DoctorCommand)

    expect(stdout).toContain('Token not expired')
    expect(stdout).toContain('failed')
    expect(scope.isDone()).toBe(true)
  })

  it('reports config directory not accessible when getConf throws', async () => {
    mockGetConf.mockImplementation(() => {
      throw new Error('Config directory missing')
    })
    mockIsKeychainAvailable.mockReturnValue(true)
    mockGetActiveProfile.mockReturnValue('default')
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 86400000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    const scope = nock('https://api.helpscout.net').get('/v2').reply(200, {})

    const stdout = await runCmd(DoctorCommand)

    expect(stdout).toContain('Config directory accessible')
    expect(stdout).toContain('failed')
    expect(scope.isDone()).toBe(true)
  })

  it('reports API unreachable when fetch fails', async () => {
    mockGetConf.mockReturnValue({
      get: vi.fn().mockReturnValue('default'),
      set: vi.fn(),
      path: '/tmp/test-config',
    })
    mockIsKeychainAvailable.mockReturnValue(true)
    mockGetActiveProfile.mockReturnValue('default')
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 86400000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    const scope = nock('https://api.helpscout.net')
      .get('/v2')
      .replyWithError('connection refused')

    const stdout = await runCmd(DoctorCommand)

    expect(stdout).toContain('API reachable')
    expect(stdout).toContain('failed')
    expect(scope.isDone()).toBe(true)
  })

  it('shows singular "check" when exactly 1 check fails', async () => {
    mockGetConf.mockReturnValue({
      get: vi.fn().mockReturnValue('default'),
      set: vi.fn(),
      path: '/tmp/test-config',
    })
    // Only the keychain check will fail
    mockIsKeychainAvailable.mockReturnValue(false)
    mockGetActiveProfile.mockReturnValue('default')
    mockGetTokens.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 86400000,
      authMode: 'authorization_code',
      credentialSource: 'byo',
    })

    const scope = nock('https://api.helpscout.net').get('/v2').reply(200, {})

    const stdout = await runCmd(DoctorCommand)

    // Should say "1 check failed" (no plural 's')
    expect(stdout).toContain('1 check failed')
    expect(stdout).not.toContain('1 checks failed')
    expect(scope.isDone()).toBe(true)
  })

  it('reports no active profile and skips token checks', async () => {
    mockGetConf.mockReturnValue({
      get: vi.fn().mockReturnValue('default'),
      set: vi.fn(),
      path: '/tmp/test-config',
    })
    mockIsKeychainAvailable.mockReturnValue(true)
    mockGetActiveProfile.mockImplementation(() => {
      throw new Error('No active profile')
    })

    const scope = nock('https://api.helpscout.net').get('/v2').reply(200, {})

    const stdout = await runCmd(DoctorCommand)

    expect(stdout).toContain('Active profile set')
    expect(stdout).toContain('Tokens present')
    expect(stdout).toContain('No active profile')
    expect(stdout).toContain('Token not expired')
    expect(stdout).toContain('No tokens found')
    expect(stdout).toContain('failed')
    expect(scope.isDone()).toBe(true)
  })
})
