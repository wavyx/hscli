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

const { default: MailboxFoldersCommand } =
  await import('../../../src/commands/mailbox/folders.js')

const fixture = {
  _embedded: {
    folders: [
      { id: 1, name: 'Inbox', type: 'open', activeCount: 10, totalCount: 50 },
      {
        id: 2,
        name: 'Mine',
        type: 'mine',
        activeCount: 3,
        totalCount: 15,
      },
      {
        id: 3,
        name: 'Closed',
        type: 'closed',
        activeCount: 0,
        totalCount: 200,
      },
    ],
  },
}

describe('hs mailbox folders', () => {
  afterEach(() => nock.cleanAll())

  it('returns folders as JSON array', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/mailboxes/42/folders')
      .reply(200, fixture)

    const stdout = await runCmd(MailboxFoldersCommand, [
      '42',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(3)
    expect(output[0].name).toBe('Inbox')
    expect(output[2].name).toBe('Closed')
    expect(scope.isDone()).toBe(true)
  })

  it('renders folders in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/mailboxes/42/folders')
      .reply(200, fixture)

    const stdout = await runCmd(MailboxFoldersCommand, [
      '42',
      '--output',
      'table',
    ])

    expect(stdout).toContain('Inbox')
    expect(stdout).toContain('Mine')
    expect(stdout).toContain('Closed')
    expect(scope.isDone()).toBe(true)
  })

  it('handles empty folder list', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/mailboxes/42/folders')
      .reply(200, { _embedded: { folders: [] } })

    const stdout = await runCmd(MailboxFoldersCommand, [
      '42',
      '--output',
      'table',
    ])

    expect(stdout).toContain('No results')
    expect(scope.isDone()).toBe(true)
  })

  it('handles response with no _embedded.folders', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/mailboxes/42/folders')
      .reply(200, {})

    const stdout = await runCmd(MailboxFoldersCommand, [
      '42',
      '--output',
      'table',
    ])

    expect(stdout).toContain('No results')
    expect(scope.isDone()).toBe(true)
  })
})
