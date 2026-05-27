import nock from 'nock'
import { runCmd } from '../../helpers.js'

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

const { default: WorkflowListCommand } =
  await import('../../../src/commands/workflow/list.js')

const fixture = {
  _embedded: {
    workflows: [
      { id: 1, name: 'Auto-close', type: 'automatic', status: 'active', mailboxId: 10, createdAt: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'Tag billing', type: 'manual', status: 'inactive', mailboxId: 11, createdAt: '2024-02-01T00:00:00Z' },
    ],
  },
  _links: { self: { href: '/v2/workflows?page=1' } },
  page: { size: 50, totalElements: 2, totalPages: 1, number: 1 },
}

describe('hs workflow list', () => {
  afterEach(() => nock.cleanAll())

  it('returns workflows as JSON array', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/workflows')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(WorkflowListCommand, ['--output', 'json'])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output[0].name).toBe('Auto-close')
    expect(scope.isDone()).toBe(true)
  })

  it('passes mailbox and type query params', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/workflows')
      .query((q) => q.mailboxId === '10' && q.type === 'manual')
      .reply(200, fixture)

    const stdout = await runCmd(WorkflowListCommand, [
      '--mailbox', '10',
      '--type', 'manual',
      '--output', 'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })

  it('renders workflows in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/workflows')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(WorkflowListCommand, ['--output', 'table'])

    expect(stdout).toContain('Auto-close')
    expect(stdout).toContain('Tag billing')
    expect(scope.isDone()).toBe(true)
  })
})
