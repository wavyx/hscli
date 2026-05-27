import { runCmd } from '../../helpers.js'

const mockDeleteTokens = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/lib/keychain.js', () => ({
  getTokens: vi.fn().mockResolvedValue({
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    expiresAt: Date.now() + 86400000,
    authMode: 'authorization_code',
    credentialSource: 'embedded',
  }),
  setTokens: vi.fn().mockResolvedValue(undefined),
  deleteTokens: mockDeleteTokens,
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

const { default: LogoutCommand } =
  await import('../../../src/commands/auth/logout.js')

describe('hs auth logout', () => {
  it('deletes tokens for active profile', async () => {
    const stdout = await runCmd(LogoutCommand)

    expect(mockDeleteTokens).toHaveBeenCalledWith('default')
    expect(stdout).toContain('Logged out')
  })
})
