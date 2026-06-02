import { runCmd } from '../../helpers.js'

const mockGetConf = vi.fn()
const mockGetActiveProfile = vi.fn()
const mockGetProfileConfig = vi.fn()
const mockIsKeychainAvailable = vi.fn()

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
  isKeychainAvailable: mockIsKeychainAvailable,
}))

vi.mock('../../../src/lib/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({ activeProfile: 'default' }),
  getActiveProfile: mockGetActiveProfile,
  setActiveProfile: vi.fn(),
  getConf: mockGetConf,
  getProfileConfig: mockGetProfileConfig,
  setProfileConfig: vi.fn(),
  getProfileData: vi.fn().mockReturnValue({}),
  getAllProfiles: vi.fn().mockReturnValue({ default: {} }),
  deleteProfileConfig: vi.fn(),
}))

const { default: ConfigValidateCommand } =
  await import('../../../src/commands/config/validate.js')

describe('hs config validate', () => {
  it('reports all checks passing when config is valid', async () => {
    mockGetConf.mockReturnValue({
      get: vi.fn().mockReturnValue('default'),
      set: vi.fn(),
      path: '/tmp/test-config',
    })
    mockGetActiveProfile.mockReturnValue('default')
    mockGetProfileConfig.mockReturnValue('my-oauth-app-id')
    mockIsKeychainAvailable.mockReturnValue(true)

    const stdout = await runCmd(ConfigValidateCommand, [])

    expect(stdout).toContain('Config directory accessible')
    expect(stdout).toContain('Active profile exists')
    expect(stdout).toContain('OAuth app configured')
    expect(stdout).toContain('Keychain accessible')
    expect(stdout).toContain('All checks passed')
  })

  it('reports JSON output with check results', async () => {
    mockGetConf.mockReturnValue({
      get: vi.fn().mockReturnValue('default'),
      set: vi.fn(),
      path: '/tmp/test-config',
    })
    mockGetActiveProfile.mockReturnValue('default')
    mockGetProfileConfig.mockReturnValue('my-oauth-app-id')
    mockIsKeychainAvailable.mockReturnValue(true)

    const stdout = await runCmd(ConfigValidateCommand, ['--output', 'json'])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output.every((r) => r.status === 'pass')).toBe(true)
  })

  it('reports failure when OAuth app is not configured', async () => {
    mockGetConf.mockReturnValue({
      get: vi.fn().mockReturnValue('default'),
      set: vi.fn(),
      path: '/tmp/test-config',
    })
    mockGetActiveProfile.mockReturnValue('default')
    mockGetProfileConfig.mockReturnValue(undefined)
    mockIsKeychainAvailable.mockReturnValue(true)
    const prevId = process.env.HSCLI_APP_ID
    const prevSecret = process.env.HSCLI_APP_SECRET
    delete process.env.HSCLI_APP_ID
    delete process.env.HSCLI_APP_SECRET

    const stdout = await runCmd(ConfigValidateCommand, [])

    expect(stdout).toContain('OAuth app configured')
    expect(stdout).toContain('FAIL')
    expect(stdout).toContain('1 check failed')
    expect(stdout).toContain('Run: hscli auth setup')

    if (prevId !== undefined) process.env.HSCLI_APP_ID = prevId
    if (prevSecret !== undefined) process.env.HSCLI_APP_SECRET = prevSecret
  })

  it('reports failure when config store is inaccessible', async () => {
    mockGetConf.mockImplementationOnce(() => {
      throw new Error('cannot access')
    })
    // Subsequent calls (e.g. via getActiveProfile -> getConf) still work
    mockGetConf.mockReturnValue({
      get: vi.fn().mockReturnValue('default'),
      set: vi.fn(),
      path: '/tmp/test-config',
    })
    mockGetActiveProfile.mockReturnValue('default')
    mockGetProfileConfig.mockReturnValue('my-oauth-app-id')
    mockIsKeychainAvailable.mockReturnValue(true)

    const stdout = await runCmd(ConfigValidateCommand, [])

    expect(stdout).toContain('Config directory accessible')
    expect(stdout).toContain('FAIL')
    expect(stdout).toContain('Cannot access config store')
  })

  it('reports failure when no active profile is set', async () => {
    mockGetConf.mockReturnValue({
      get: vi.fn().mockReturnValue('default'),
      set: vi.fn(),
      path: '/tmp/test-config',
    })
    mockGetActiveProfile.mockImplementationOnce(() => {
      throw new Error('no profile')
    })
    mockGetProfileConfig.mockReturnValue('my-oauth-app-id')
    mockIsKeychainAvailable.mockReturnValue(true)

    const stdout = await runCmd(ConfigValidateCommand, [])

    expect(stdout).toContain('Active profile exists')
    expect(stdout).toContain('FAIL')
    expect(stdout).toContain('No active profile set')
    expect(stdout).toContain('No active profile')
  })

  it('reports JSON output with failing check', async () => {
    mockGetConf.mockReturnValue({
      get: vi.fn().mockReturnValue('default'),
      set: vi.fn(),
      path: '/tmp/test-config',
    })
    mockGetActiveProfile.mockReturnValue('default')
    mockGetProfileConfig.mockReturnValue(undefined)
    mockIsKeychainAvailable.mockReturnValue(true)
    const prevId = process.env.HSCLI_APP_ID
    const prevSecret = process.env.HSCLI_APP_SECRET
    delete process.env.HSCLI_APP_ID
    delete process.env.HSCLI_APP_SECRET

    const stdout = await runCmd(ConfigValidateCommand, ['--output', 'json'])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output.some((r) => r.status === 'fail')).toBe(true)
    expect(output.some((r) => r.status === 'pass')).toBe(true)

    if (prevId !== undefined) process.env.HSCLI_APP_ID = prevId
    if (prevSecret !== undefined) process.env.HSCLI_APP_SECRET = prevSecret
  })

  it('reports keychain unavailable detail when keychain is missing', async () => {
    mockGetConf.mockReturnValue({
      get: vi.fn().mockReturnValue('default'),
      set: vi.fn(),
      path: '/tmp/test-config',
    })
    mockGetActiveProfile.mockReturnValue('default')
    mockGetProfileConfig.mockReturnValue('my-oauth-app-id')
    mockIsKeychainAvailable.mockReturnValue(false)

    const stdout = await runCmd(ConfigValidateCommand, [])

    expect(stdout).toContain('Keychain accessible')
    expect(stdout).toContain(
      'OS keychain unavailable, using fallback file store',
    )
  })
})
