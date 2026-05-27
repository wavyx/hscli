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

const { default: ConvSearchCommand } =
  await import('../../../src/commands/conv/search.js')

const fixture = {
  _embedded: {
    conversations: [
      {
        id: 100,
        number: 1001,
        subject: 'Need help with billing',
        status: 'active',
        mailboxId: 42,
        assignee: { id: 1, first: 'Jane', last: 'Doe' },
        createdAt: '2024-06-15T09:00:00Z',
      },
      {
        id: 101,
        number: 1002,
        subject: 'Billing refund request',
        status: 'active',
        mailboxId: 42,
        assignee: null,
        createdAt: '2024-06-14T14:30:00Z',
      },
    ],
  },
  _links: { self: { href: '/v2/conversations?page=1' } },
  page: { size: 25, totalElements: 2, totalPages: 1, number: 1 },
}

describe('hs conv search', () => {
  afterEach(() => nock.cleanAll())

  it('returns matching conversations as JSON', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => q.query === 'billing')
      .reply(200, fixture)

    const stdout = await runCmd(ConvSearchCommand, [
      'billing',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output[0].subject).toBe('Need help with billing')
    expect(scope.isDone()).toBe(true)
  })

  it('passes mailbox filter to API', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => q.query === 'billing' && q.mailbox === '42')
      .reply(200, fixture)

    const stdout = await runCmd(ConvSearchCommand, [
      'billing',
      '--mailbox',
      '42',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })

  it('renders assignee name in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(ConvSearchCommand, [
      'billing',
      '--output',
      'table',
    ])

    expect(stdout).toContain('Jane Doe')
    expect(stdout).toContain('Need help with billing')
    expect(scope.isDone()).toBe(true)
  })
})
