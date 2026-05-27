import { runCmd } from '../../helpers.js'

const mockGetProfileData = vi.fn()

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
  getProfileData: mockGetProfileData,
  getAllProfiles: vi.fn().mockReturnValue({ default: {} }),
  deleteProfileConfig: vi.fn(),
}))

const { default: ConfigListCommand } =
  await import('../../../src/commands/config/list.js')

describe('hs config list', () => {
  it('shows config entries', async () => {
    mockGetProfileData.mockReturnValue({
      apiBase: 'https://api.helpscout.net',
      output: 'json',
    })

    const stdout = await runCmd(ConfigListCommand)

    expect(stdout).toContain('apiBase=https://api.helpscout.net')
    expect(stdout).toContain('output=json')
  })

  it('shows message when empty', async () => {
    mockGetProfileData.mockReturnValue({})

    const stdout = await runCmd(ConfigListCommand)

    expect(stdout).toContain('No config set')
    expect(stdout).toContain('default')
  })
})
