import { runCmd } from '../../helpers.js'

const mockSetProfileConfig = vi.fn()

vi.mock('../../../src/lib/keychain.js', () => ({
  getTokens: vi.fn().mockResolvedValue({
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    expiresAt: Date.now() + 86400000,
    authMode: 'authorization_code',
    credentialSource: 'embedded',
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
  setProfileConfig: mockSetProfileConfig,
  getProfileData: vi.fn().mockReturnValue({}),
  getAllProfiles: vi.fn().mockReturnValue({ default: {} }),
  deleteProfileConfig: vi.fn(),
}))

const { default: ConfigSetCommand } =
  await import('../../../src/commands/config/set.js')

describe('hs config set', () => {
  it('calls setProfileConfig with correct args', async () => {
    await runCmd(ConfigSetCommand, ['apiBase', 'https://api.helpscout.net'])

    expect(mockSetProfileConfig).toHaveBeenCalledWith(
      'default',
      'apiBase',
      'https://api.helpscout.net',
    )
  })

  it('logs confirmation message', async () => {
    const stdout = await runCmd(ConfigSetCommand, ['output', 'json'])

    expect(stdout).toContain('output')
    expect(stdout).toContain('json')
    expect(stdout).toContain('default')
  })
})
