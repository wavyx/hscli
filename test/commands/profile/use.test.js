import { runCmd } from '../../helpers.js'

const mockSetActiveProfile = vi.fn()

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
  setActiveProfile: mockSetActiveProfile,
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

const { default: ProfileUseCommand } =
  await import('../../../src/commands/profile/use.js')

describe('hs profile use', () => {
  it('calls setActiveProfile with the correct arg', async () => {
    await runCmd(ProfileUseCommand, ['work'])

    expect(mockSetActiveProfile).toHaveBeenCalledWith('work')
  })

  it('logs confirmation message', async () => {
    const stdout = await runCmd(ProfileUseCommand, ['staging'])

    expect(stdout).toContain('Switched to profile')
    expect(stdout).toContain('staging')
  })
})
