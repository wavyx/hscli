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

const { default: ConvWatchCommand } =
  await import('../../../src/commands/conv/watch.js')

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
        subject: 'API integration question',
        status: 'active',
        mailboxId: 42,
        assignee: null,
        createdAt: '2024-06-14T14:30:00Z',
      },
    ],
  },
  page: { size: 25, totalElements: 2, totalPages: 1, number: 1 },
}

describe('hs conv watch', () => {
  afterEach(() => nock.cleanAll())

  it('fetches and displays conversations on first poll with --once', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(ConvWatchCommand, [
      '--once',
      '--output',
      'json',
    ])

    expect(stdout).toContain('---')
    expect(stdout).toContain('Need help with billing')
    expect(stdout).toContain('API integration question')
    expect(scope.isDone()).toBe(true)
  })

  it('passes mailbox and status filters', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => q.mailbox === '42' && q.status === 'pending')
      .reply(200, fixture)

    const stdout = await runCmd(ConvWatchCommand, [
      '--once',
      '--mailbox',
      '42',
      '--status',
      'pending',
      '--output',
      'json',
    ])

    expect(stdout).toContain('Need help with billing')
    expect(scope.isDone()).toBe(true)
  })

  it('shows "No new conversations" when none returned', async () => {
    const emptyFixture = {
      _embedded: { conversations: [] },
      page: { size: 25, totalElements: 0, totalPages: 1, number: 1 },
    }

    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, emptyFixture)

    const stdout = await runCmd(ConvWatchCommand, ['--once'])

    expect(stdout).toContain('No new conversations.')
    expect(scope.isDone()).toBe(true)
  })

  it('renders table output with assignee names', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(ConvWatchCommand, [
      '--once',
      '--output',
      'table',
    ])

    expect(stdout).toContain('Jane Doe')
    expect(stdout).toContain('Need help with billing')
    expect(scope.isDone()).toBe(true)
  })

  it('tracks lastSeen between polls and exits after max-polls', async () => {
    // First poll: returns conversations with createdAt timestamps.
    // Second poll: nock matcher asserts modifiedSince is the stripped-ms ISO
    // string of the latest createdAt from the first poll (2024-06-15T09:00:00Z).
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => !q.modifiedSince)
      .reply(200, fixture)
      .get('/v2/conversations')
      .query((q) => q.modifiedSince === '2024-06-15T09:00:00Z')
      .reply(200, {
        _embedded: { conversations: [] },
        page: { size: 25, totalElements: 0, totalPages: 1, number: 1 },
      })

    const stdout = await runCmd(ConvWatchCommand, [
      '--poll',
      '0',
      '--max-polls',
      '2',
      '--output',
      'json',
    ])

    expect(stdout).toContain('Need help with billing')
    expect(stdout).toContain('No new conversations.')
    expect(scope.isDone()).toBe(true)
  })

  it('exits after first poll when --max-polls is 1', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(ConvWatchCommand, [
      '--max-polls',
      '1',
      '--output',
      'json',
    ])

    expect(stdout).toContain('Need help with billing')
    expect(scope.isDone()).toBe(true)
  })
})
