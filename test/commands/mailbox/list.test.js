import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(join(__dirname, '../../fixtures/mailboxes-list.json'), 'utf8'),
)

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

const { default: MailboxListCommand } =
  await import('../../../src/commands/mailbox/list.js')

describe('hs mailbox list', () => {
  afterEach(() => nock.cleanAll())

  it('returns mailboxes as JSON array', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/mailboxes')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(MailboxListCommand, ['--output', 'json'])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output[0].name).toBe('Support')
    expect(output[1].name).toBe('Sales')
    expect(scope.isDone()).toBe(true)
  })

  it('renders mailbox names in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/mailboxes')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(MailboxListCommand, ['--output', 'table'])

    expect(stdout).toContain('Support')
    expect(stdout).toContain('Sales')
    expect(stdout).toContain('support@example.com')
    expect(stdout).toContain('sales@example.com')
    expect(scope.isDone()).toBe(true)
  })

  it('respects the --limit flag', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/mailboxes')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(MailboxListCommand, [
      '--output',
      'json',
      '--limit',
      '1',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(1)
    expect(output[0].name).toBe('Support')
    expect(scope.isDone()).toBe(true)
  })
})
