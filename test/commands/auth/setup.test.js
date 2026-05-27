import nock from 'nock'
import { runCmd } from '../../helpers.js'

const mockInput = vi.fn()
const mockPassword = vi.fn()

vi.mock('@inquirer/prompts', () => ({
  input: mockInput,
  password: mockPassword,
}))

vi.mock('../../../src/lib/keychain.js', () => ({
  getTokens: vi.fn().mockResolvedValue(null),
  setTokens: vi.fn().mockResolvedValue(undefined),
  deleteTokens: vi.fn().mockResolvedValue(undefined),
  isKeychainAvailable: vi.fn().mockReturnValue(true),
}))

const mockSetProfileConfig = vi.fn()

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

vi.mock('open', () => ({ default: vi.fn() }))

const { setTokens: mockSetTokens } = await import(
  '../../../src/lib/keychain.js'
)
const { default: SetupCommand } = await import(
  '../../../src/commands/auth/setup.js'
)

describe('hs auth setup', () => {
  beforeEach(() => {
    mockInput.mockReset()
    mockPassword.mockReset()
    mockSetProfileConfig.mockClear()
    mockSetTokens.mockClear()
    nock.cleanAll()
  })

  afterAll(() => {
    nock.restore()
  })

  it('stores credentials after interactive prompts and validates', async () => {
    mockInput.mockResolvedValue('my-app-id')
    mockPassword.mockResolvedValue('my-app-secret')

    nock('https://api.helpscout.net')
      .post('/v2/oauth2/token')
      .reply(200, {
        access_token: 'new-access-token',
        expires_in: 172800,
      })

    const stdout = await runCmd(SetupCommand, [])

    expect(mockInput).toHaveBeenCalled()
    expect(mockPassword).toHaveBeenCalled()
    expect(mockSetProfileConfig).toHaveBeenCalledWith(
      'default',
      'oauth_app_id',
      'my-app-id',
    )
    expect(mockSetTokens).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        accessToken: 'new-access-token',
        authMode: 'client_credentials',
        credentialSource: 'byo',
      }),
    )
    expect(stdout).toContain('configured and validated')
    expect(stdout).toContain('default')
  })

  it('uses --app-id and --app-secret flags for non-interactive mode', async () => {
    nock('https://api.helpscout.net')
      .post('/v2/oauth2/token')
      .reply(200, {
        access_token: 'flag-access-token',
        expires_in: 172800,
      })

    const stdout = await runCmd(SetupCommand, [
      '--app-id',
      'flag-id',
      '--app-secret',
      'flag-secret',
    ])

    expect(mockInput).not.toHaveBeenCalled()
    expect(mockPassword).not.toHaveBeenCalled()
    expect(mockSetProfileConfig).toHaveBeenCalledWith(
      'default',
      'oauth_app_id',
      'flag-id',
    )
    expect(mockSetTokens).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        accessToken: 'flag-access-token',
        authMode: 'client_credentials',
        credentialSource: 'byo',
      }),
    )
    expect(stdout).toContain('configured and validated')
  })

  it('shows error when validation fails', async () => {
    mockInput.mockResolvedValue('bad-id')
    mockPassword.mockResolvedValue('bad-secret')

    nock('https://api.helpscout.net')
      .post('/v2/oauth2/token')
      .reply(401, {
        error: 'invalid_client',
        error_description: 'Invalid client authentication',
      })

    const stdout = await runCmd(SetupCommand, [])

    expect(mockSetProfileConfig).not.toHaveBeenCalled()
    expect(mockSetTokens).not.toHaveBeenCalled()
    expect(stdout).toContain('Could not authenticate')
  })
})
