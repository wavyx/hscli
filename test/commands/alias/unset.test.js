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

const { default: AliasUnsetCommand } =
  await import('../../../src/commands/alias/unset.js')

describe('hs alias unset', () => {
  beforeEach(() => {
    mockSetAlias.mockReset()
    mockGetAlias.mockReset()
    mockUnsetAlias.mockReset()
    mockGetAliases.mockReset()
  })

  it('removes an existing alias and logs confirmation', async () => {
    mockGetAlias.mockReturnValue('conv list')

    const stdout = await runCmd(AliasUnsetCommand, ['ll'])

    expect(mockUnsetAlias).toHaveBeenCalledWith('ll')
    expect(stdout).toContain('Alias removed')
    expect(stdout).toContain('ll')
  })

  it('logs not-found and does not call unsetAlias for missing alias', async () => {
    mockGetAlias.mockReturnValue(undefined)

    const stdout = await runCmd(AliasUnsetCommand, ['missing'])

    expect(mockUnsetAlias).not.toHaveBeenCalled()
    expect(stdout).toContain('not found')
    expect(stdout).toContain('missing')
  })
})
