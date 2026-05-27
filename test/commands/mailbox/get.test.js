import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(join(__dirname, '../../fixtures/mailbox-get.json'), 'utf8'),
)

vi.mock('../../../src/lib/keychain.js', () => ({
  getTokens: vi.fn().mockResolvedValue({
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    expiresAt: Date.now() + 86400000,
    authMode: 'authorization_code',
    credentialSource: 'embedded',
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
    source: 'embedded',
  }),
  refreshAccessToken: vi.fn().mockResolvedValue({
    accessToken: 'refreshed-token',
    refreshToken: 'refreshed-refresh',
    expiresIn: 172800,
  }),
}))

const { default: MailboxGetCommand } =
  await import('../../../src/commands/mailbox/get.js')

describe('hs mailbox get', () => {
  afterEach(() => nock.cleanAll())

  it('returns a single mailbox as JSON', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/mailboxes/42')
      .reply(200, fixture)

    const stdout = await runCmd(MailboxGetCommand, ['42', '--output', 'json'])
    const output = JSON.parse(stdout)

    // mailbox:get wraps result in array via outputResults([data], columns)
    expect(output[0].id).toBe(42)
    expect(output[0].name).toBe('Support')
    expect(output[0].slug).toBe('support')
    expect(output[0].email).toBe('support@example.com')
    expect(scope.isDone()).toBe(true)
  })

  it('renders mailbox details in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/mailboxes/42')
      .reply(200, fixture)

    const stdout = await runCmd(MailboxGetCommand, ['42', '--output', 'table'])

    expect(stdout).toContain('Support')
    expect(stdout).toContain('support')
    expect(stdout).toContain('support@example.com')
    expect(scope.isDone()).toBe(true)
  })
})
