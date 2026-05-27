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

const { default: MailboxFieldsCommand } =
  await import('../../../src/commands/mailbox/fields.js')

const fixture = {
  _embedded: {
    fields: [
      { id: 1, name: 'Priority', type: 'dropdown', required: true, order: 1 },
      { id: 2, name: 'Category', type: 'text', required: false, order: 2 },
    ],
  },
}

describe('hs mailbox fields', () => {
  afterEach(() => nock.cleanAll())

  it('returns fields as JSON array', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/mailboxes/42/fields')
      .reply(200, fixture)

    const stdout = await runCmd(MailboxFieldsCommand, [
      '42',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output[0].name).toBe('Priority')
    expect(output[1].name).toBe('Category')
    expect(scope.isDone()).toBe(true)
  })

  it('renders fields in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/mailboxes/42/fields')
      .reply(200, fixture)

    const stdout = await runCmd(MailboxFieldsCommand, [
      '42',
      '--output',
      'table',
    ])

    expect(stdout).toContain('Priority')
    expect(stdout).toContain('Category')
    expect(stdout).toContain('dropdown')
    expect(scope.isDone()).toBe(true)
  })

  it('handles empty fields list', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/mailboxes/42/fields')
      .reply(200, { _embedded: { fields: [] } })

    const stdout = await runCmd(MailboxFieldsCommand, [
      '42',
      '--output',
      'table',
    ])

    expect(stdout).toContain('No results')
    expect(scope.isDone()).toBe(true)
  })
})
