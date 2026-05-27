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

    const stdout = await runCmd(ConfigValidateCommand, [])

    expect(stdout).toContain('OAuth app configured')
    expect(stdout).toContain('FAIL')
    expect(stdout).toContain('1 check failed')
  })
})
