import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(
    join(__dirname, '../../fixtures/conversations-get.json'),
    'utf8',
  ),
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

const { default: ConvGetCommand } =
  await import('../../../src/commands/conv/get.js')

describe('hs conv get', () => {
  afterEach(() => nock.cleanAll())

  it('returns a conversation with threads in JSON format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/100')
      .reply(200, fixture)

    const stdout = await runCmd(ConvGetCommand, ['100', '--output', 'json'])
    const output = JSON.parse(stdout)

    // conv:get passes raw data (not array) for JSON output
    expect(output.id).toBe(100)
    expect(output.number).toBe(1001)
    expect(output.subject).toBe('Need help with billing')
    expect(output.status).toBe('active')
    expect(output._embedded.threads).toHaveLength(1)
    expect(output._embedded.threads[0].body).toBe(
      'I need help understanding my invoice',
    )
    expect(scope.isDone()).toBe(true)
  })

  it('renders conversation details in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/100')
      .reply(200, fixture)

    const stdout = await runCmd(ConvGetCommand, ['100', '--output', 'table'])

    expect(stdout).toContain('Need help with billing')
    expect(stdout).toContain('active')
    expect(stdout).toContain('customer@example.com')
    expect(scope.isDone()).toBe(true)
  })

  it('handles missing primaryCustomer gracefully', async () => {
    const noPrimary = { ...fixture, primaryCustomer: undefined }
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/100')
      .reply(200, noPrimary)

    const stdout = await runCmd(ConvGetCommand, ['100', '--output', 'table'])

    expect(stdout).toContain('Need help with billing')
    expect(scope.isDone()).toBe(true)
  })

  it('strips _embedded from table output', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/100')
      .reply(200, fixture)

    const stdout = await runCmd(ConvGetCommand, ['100', '--output', 'table'])

    // Table output should not contain raw thread body text
    // (threads are only included in JSON output)
    expect(stdout).not.toContain('I need help understanding my invoice')
    expect(scope.isDone()).toBe(true)
  })
})
