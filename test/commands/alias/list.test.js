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

const { default: AliasListCommand } =
  await import('../../../src/commands/alias/list.js')

describe('hs alias list', () => {
  beforeEach(() => {
    mockSetAlias.mockReset()
    mockGetAlias.mockReset()
    mockUnsetAlias.mockReset()
    mockGetAliases.mockReset()
  })

  it('shows message when no aliases configured', async () => {
    mockGetAliases.mockReturnValue({})

    const stdout = await runCmd(AliasListCommand)

    expect(stdout).toContain('No aliases configured')
  })

  it('renders aliases in table format', async () => {
    mockGetAliases.mockReturnValue({
      ll: 'conv list --limit 50',
      inbox: 'conv list --mailbox 42',
    })

    const stdout = await runCmd(AliasListCommand, ['--output', 'table'])

    expect(stdout).toContain('ll')
    expect(stdout).toContain('conv list --limit 50')
    expect(stdout).toContain('inbox')
    expect(stdout).toContain('conv list --mailbox 42')
  })

  it('renders aliases as JSON when --output json', async () => {
    mockGetAliases.mockReturnValue({
      ll: 'conv list',
      inbox: 'conv list --mailbox 42',
    })

    const stdout = await runCmd(AliasListCommand, ['--output', 'json'])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output).toContainEqual({ name: 'll', command: 'conv list' })
    expect(output).toContainEqual({
      name: 'inbox',
      command: 'conv list --mailbox 42',
    })
  })
})
