import { runCmd } from '../../helpers.js'

const mockGetTokens = vi.fn()
const mockSetTokens = vi.fn().mockResolvedValue(undefined)
const mockRefreshAccessToken = vi.fn()

vi.mock('../../../src/lib/keychain.js', () => ({
  getTokens: mockGetTokens,
  setTokens: mockSetTokens,
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
  getProfileData: vi.fn().mockReturnValue({}),
  getAllProfiles: vi.fn().mockReturnValue({ default: {} }),
  deleteProfileConfig: vi.fn(),
}))

vi.mock('../../../src/lib/auth.js', () => ({
  getValidToken: vi.fn().mockResolvedValue('test-token'),
  resolveCredentials: vi.fn().mockReturnValue({
    clientId: 'test-id',
    clientSecret: 'test-secret',
    source: 'profile',
  }),
  refreshAccessToken: mockRefreshAccessToken,
  authorizationCodeFlow: vi.fn(),
  clientCredentialsFlow: vi.fn(),
}))

const { default: RefreshCommand } =
  await import('../../../src/commands/auth/refresh.js')

describe('hs auth refresh', () => {
  beforeEach(() => {
    mockSetTokens.mockClear()
    mockRefreshAccessToken.mockClear()
  })

  it('refreshes and stores new tokens', async () => {
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

    const stdout = await runCmd(RefreshCommand)

    expect(mockRefreshAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshToken: 'old-refresh',
        clientId: 'test-id',
        clientSecret: 'test-secret',
      }),
    )
    expect(mockSetTokens).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
      }),
    )
    expect(stdout).toContain('Profile')
    expect(stdout).toContain('default')
  })

  it('errors when no refresh token (client-credentials mode)', async () => {
    mockGetTokens.mockResolvedValue({
      accessToken: 'cc-token',
      refreshToken: undefined,
      expiresAt: Date.now() + 86400000,
      authMode: 'client_credentials',
      credentialSource: 'byo',
    })

    await runCmd(RefreshCommand)

    expect(mockRefreshAccessToken).not.toHaveBeenCalled()
    expect(mockSetTokens).not.toHaveBeenCalled()
  })
})
