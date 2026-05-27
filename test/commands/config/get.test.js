import { runCmd } from '../../helpers.js'

const mockGetProfileConfig = vi.fn()

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
  getProfileConfig: mockGetProfileConfig,
  setProfileConfig: vi.fn(),
  getProfileData: vi.fn().mockReturnValue({}),
  getAllProfiles: vi.fn().mockReturnValue({ default: {} }),
  deleteProfileConfig: vi.fn(),
}))

const { default: ConfigGetCommand } =
  await import('../../../src/commands/config/get.js')

describe('hs config get', () => {
  it('returns value when config key exists', async () => {
    mockGetProfileConfig.mockReturnValue('https://api.helpscout.net')

    const stdout = await runCmd(ConfigGetCommand, ['apiBase'])

    expect(stdout).toContain('https://api.helpscout.net')
  })

  it('shows "not set" when key is missing', async () => {
    mockGetProfileConfig.mockReturnValue(undefined)

    const stdout = await runCmd(ConfigGetCommand, ['nonExistentKey'])

    expect(stdout).toContain('not set')
  })
})
