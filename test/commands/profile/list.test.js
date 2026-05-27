import { runCmd } from '../../helpers.js'

const mockGetAllProfiles = vi.fn()
const mockGetActiveProfile = vi.fn()

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
  getActiveProfile: mockGetActiveProfile,
  setActiveProfile: vi.fn(),
  getConf: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue('default'),
    set: vi.fn(),
    path: '/tmp/test-config',
  }),
  getProfileConfig: vi.fn().mockReturnValue(undefined),
  setProfileConfig: vi.fn(),
  getProfileData: vi.fn().mockReturnValue({}),
  getAllProfiles: mockGetAllProfiles,
  deleteProfileConfig: vi.fn(),
}))

const { default: ProfileListCommand } =
  await import('../../../src/commands/profile/list.js')

describe('hs profile list', () => {
  it('lists all profiles with active marker', async () => {
    mockGetAllProfiles.mockReturnValue({ default: {}, work: {}, staging: {} })
    mockGetActiveProfile.mockReturnValue('work')

    const stdout = await runCmd(ProfileListCommand)

    expect(stdout).toContain('default')
    expect(stdout).toContain('work')
    expect(stdout).toContain('staging')
    // Active profile gets a star prefix
    expect(stdout).toContain('* work')
  })

  it('shows message when no profiles and no tokens exist', async () => {
    mockGetAllProfiles.mockReturnValue({})
    mockGetActiveProfile.mockReturnValue('default')
    const { getTokens } = await import('../../../src/lib/keychain.js')
    getTokens.mockResolvedValueOnce(null)

    const stdout = await runCmd(ProfileListCommand)

    expect(stdout).toContain('No profiles configured')
  })

  it('marks default as active when it is the active profile', async () => {
    mockGetAllProfiles.mockReturnValue({ default: {}, work: {} })
    mockGetActiveProfile.mockReturnValue('default')

    const stdout = await runCmd(ProfileListCommand)

    expect(stdout).toContain('* default')
  })

  it('shows profile without authenticated status when no tokens', async () => {
    mockGetAllProfiles.mockReturnValue({ default: {}, staging: {} })
    mockGetActiveProfile.mockReturnValue('default')
    const { getTokens } = await import('../../../src/lib/keychain.js')
    getTokens
      .mockResolvedValueOnce({ accessToken: 'x' }) // active profile check
      .mockResolvedValueOnce({ accessToken: 'x' }) // default loop
      .mockResolvedValueOnce(null) // staging loop — no tokens

    const stdout = await runCmd(ProfileListCommand)

    expect(stdout).toContain('* default')
    expect(stdout).toContain('staging')
    expect(stdout).not.toMatch(/staging.*authenticated/)
  })
})
