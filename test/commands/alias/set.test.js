import { runCmd } from '../../helpers.js'

const mockSetAlias = vi.fn()
const mockGetAlias = vi.fn()
const mockUnsetAlias = vi.fn()
const mockGetAliases = vi.fn()

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
  getProfileData: vi.fn().mockReturnValue({}),
  getAllProfiles: vi.fn().mockReturnValue({ default: {} }),
  deleteProfileConfig: vi.fn(),
}))

vi.mock('../../../src/lib/auth.js', () => ({
  getValidToken: vi.fn().mockResolvedValue('test-token'),
  resolveCredentials: vi.fn().mockReturnValue({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    source: 'profile',
  }),
  refreshAccessToken: vi.fn().mockResolvedValue({
    accessToken: 'refreshed-token',
    refreshToken: 'refreshed-refresh',
    expiresIn: 172800,
  }),
}))

vi.mock('../../../src/lib/aliases.js', () => ({
  setAlias: mockSetAlias,
  getAlias: mockGetAlias,
  unsetAlias: mockUnsetAlias,
  getAliases: mockGetAliases,
}))

const { default: AliasSetCommand } =
  await import('../../../src/commands/alias/set.js')

describe('hs alias set', () => {
  beforeEach(() => {
    mockSetAlias.mockReset()
    mockGetAlias.mockReset()
    mockUnsetAlias.mockReset()
    mockGetAliases.mockReset()
  })

  it('calls setAlias with name and command', async () => {
    await runCmd(AliasSetCommand, ['ll', 'conv list'])

    expect(mockSetAlias).toHaveBeenCalledWith('ll', 'conv list')
  })

  it('logs confirmation message with alias name and command', async () => {
    const stdout = await runCmd(AliasSetCommand, [
      'inbox',
      'conv list --mailbox 42',
    ])

    expect(stdout).toContain('inbox')
    expect(stdout).toContain('conv list --mailbox 42')
  })
})
