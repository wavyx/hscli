import nock from 'nock'
import { runCmd } from '../../helpers.js'

vi.mock('../../../src/lib/keychain.js', () => ({
  getTokens: vi.fn().mockResolvedValue({
    accessToken: 'test-token',
    refreshToken: 'r',
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
    clientId: 'cid',
    clientSecret: 'csec',
    source: 'profile',
  }),
  refreshAccessToken: vi.fn().mockResolvedValue({
    accessToken: 'r',
    refreshToken: 'r',
    expiresIn: 172800,
  }),
}))

const { default: CustomerConversationsCommand } =
  await import('../../../src/commands/customer/conversations.js')

const fixture = {
  _embedded: {
    conversations: [
      {
        id: 200,
        number: 2001,
        subject: 'Billing question',
        status: 'active',
        mailboxId: 42,
        createdAt: '2024-03-01T00:00:00Z',
      },
      {
        id: 201,
        number: 2002,
        subject: 'Feature request',
        status: 'closed',
        mailboxId: 43,
        createdAt: '2024-04-01T00:00:00Z',
      },
    ],
  },
  _links: { self: { href: '/v2/customers/100/conversations?page=1' } },
  page: { size: 25, totalElements: 2, totalPages: 1, number: 1 },
}

describe('hs customer conversations', () => {
  afterEach(() => nock.cleanAll())

  it('returns conversations as JSON array', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/customers/100/conversations')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(CustomerConversationsCommand, [
      '100',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output[0].subject).toBe('Billing question')
    expect(output[1].subject).toBe('Feature request')
    expect(scope.isDone()).toBe(true)
  })

  it('renders conversations in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/customers/100/conversations')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(CustomerConversationsCommand, [
      '100',
      '--output',
      'table',
    ])

    expect(stdout).toContain('Billing question')
    expect(stdout).toContain('Feature request')
    expect(stdout).toContain('active')
    expect(stdout).toContain('closed')
    expect(scope.isDone()).toBe(true)
  })
})
