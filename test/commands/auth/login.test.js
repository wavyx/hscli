import { runCmd } from '../../helpers.js'
import { ApiError } from '../../../src/lib/errors.js'

const mockSetTokens = vi.fn().mockResolvedValue(undefined)
const mockSetProfileConfig = vi.fn()
const mockClientCredentialsFlow = vi.fn()
const mockAuthorizationCodeFlow = vi.fn()
const mockResolveCredentials = vi.fn()

vi.mock('../../../src/lib/keychain.js', () => ({
  getTokens: vi.fn().mockResolvedValue({
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    expiresAt: Date.now() + 86400000,
    authMode: 'authorization_code',
    credentialSource: 'byo',
  }),
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
  setProfileConfig: mockSetProfileConfig,
  getProfileData: vi.fn().mockReturnValue({}),
  getAllProfiles: vi.fn().mockReturnValue({ default: {} }),
  deleteProfileConfig: vi.fn(),
}))

vi.mock('../../../src/lib/auth.js', () => ({
  getValidToken: vi.fn().mockResolvedValue('test-token'),
  resolveCredentials: mockResolveCredentials,
  refreshAccessToken: vi.fn().mockResolvedValue({
    accessToken: 'refreshed',
    refreshToken: 'refreshed-r',
    expiresIn: 172800,
  }),
  authorizationCodeFlow: mockAuthorizationCodeFlow,
  clientCredentialsFlow: mockClientCredentialsFlow,
}))

const { default: LoginCommand } =
  await import('../../../src/commands/auth/login.js')

describe('hs auth login', () => {
  beforeEach(() => {
    mockSetTokens.mockClear()
    mockSetProfileConfig.mockClear()
    mockClientCredentialsFlow.mockClear()
    mockAuthorizationCodeFlow.mockClear()
    mockResolveCredentials.mockClear()
  })

  it('client-credentials flow stores tokens and registers profile', async () => {
    mockResolveCredentials.mockReturnValue({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      source: 'profile',
    })
    mockClientCredentialsFlow.mockResolvedValue({
      accessToken: 'new-token',
      expiresIn: 172800,
    })

    const stdout = await runCmd(LoginCommand, ['--client-credentials'])

    expect(mockClientCredentialsFlow).toHaveBeenCalledWith({
      clientId: 'test-id',
      clientSecret: 'test-secret',
    })
    expect(mockSetTokens).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        accessToken: 'new-token',
        refreshToken: undefined,
        authMode: 'client_credentials',
        credentialSource: 'byo',
      }),
    )
    expect(mockSetProfileConfig).toHaveBeenCalledWith(
      'default',
      'auth_mode',
      'client_credentials',
    )
    expect(stdout).toContain('Profile')
    expect(stdout).toContain('default')
  })

  it('uses BYO credential source when flags provided', async () => {
    mockResolveCredentials.mockReturnValue({
      clientId: 'byo-id',
      clientSecret: 'byo-secret',
      source: 'flags',
    })
    mockClientCredentialsFlow.mockResolvedValue({
      accessToken: 'byo-token',
      expiresIn: 172800,
    })

    await runCmd(LoginCommand, [
      '--client-credentials',
      '--app-id',
      'byo-id',
      '--app-secret',
      'byo-secret',
    ])

    expect(mockSetTokens).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        accessToken: 'byo-token',
        credentialSource: 'byo',
      }),
    )
  })

  it('handles invalid_client error gracefully', async () => {
    mockResolveCredentials.mockReturnValue({
      clientId: 'bad-id',
      clientSecret: 'bad-secret',
      source: 'profile',
    })
    mockClientCredentialsFlow.mockRejectedValue(
      new ApiError(
        401,
        {
          error: 'invalid_client',
          error_description: 'Invalid client authentication',
        },
        '/v2/oauth2/token',
      ),
    )

    const stdout = await runCmd(LoginCommand, ['--client-credentials'])

    expect(stdout).toContain('Invalid client credentials')
    expect(stdout).toContain('hs auth setup')
  })

  it('runs authorization code flow when --client-credentials is NOT passed', async () => {
    mockResolveCredentials.mockReturnValue({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      source: 'profile',
    })
    mockAuthorizationCodeFlow.mockResolvedValue({
      accessToken: 'auth-code-token',
      refreshToken: 'auth-code-refresh',
      expiresIn: 172800,
    })

    const stdout = await runCmd(LoginCommand, [])

    expect(mockAuthorizationCodeFlow).toHaveBeenCalledWith({
      clientId: 'test-id',
      clientSecret: 'test-secret',
    })
    expect(mockSetTokens).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        accessToken: 'auth-code-token',
        refreshToken: 'auth-code-refresh',
        authMode: 'authorization_code',
        credentialSource: 'byo',
      }),
    )
    expect(mockSetProfileConfig).toHaveBeenCalledWith(
      'default',
      'auth_mode',
      'authorization_code',
    )
    expect(stdout).toContain('Profile')
    expect(stdout).toContain('default')
  })

  it('stores BYO credential source in authorization code flow', async () => {
    mockResolveCredentials.mockReturnValue({
      clientId: 'byo-id',
      clientSecret: 'byo-secret',
      source: 'flags',
    })
    mockAuthorizationCodeFlow.mockResolvedValue({
      accessToken: 'byo-auth-token',
      refreshToken: 'byo-auth-refresh',
      expiresIn: 172800,
    })

    await runCmd(LoginCommand, [])

    expect(mockSetTokens).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        accessToken: 'byo-auth-token',
        credentialSource: 'byo',
        authMode: 'authorization_code',
      }),
    )
  })

  it('re-throws non-invalid_client errors', async () => {
    mockResolveCredentials.mockReturnValue({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      source: 'profile',
    })
    const serverError = new ApiError(
      500,
      { error: 'server_error', message: 'Internal server error' },
      '/v2/oauth2/token',
    )
    mockClientCredentialsFlow.mockRejectedValue(serverError)

    // The error should be re-thrown (oclif wraps it as CLIError but preserves the message)
    // Verify it rejects with the error message and NOT the invalid_client handler
    await expect(LoginCommand.run(['--client-credentials'])).rejects.toThrow(
      /Internal server error/,
    )
  })
})
