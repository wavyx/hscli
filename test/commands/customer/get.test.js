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

const { default: CustomerGetCommand } =
  await import('../../../src/commands/customer/get.js')

describe('hs customer get', () => {
  afterEach(() => nock.cleanAll())

  it('returns a single customer as JSON', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/customers/100')
      .reply(200, {
        id: 100,
        firstName: 'Alice',
        lastName: 'Wong',
        emails: [{ id: 1, value: 'alice@example.com' }],
        organization: 'Acme Corp',
        jobTitle: 'Engineer',
        createdAt: '2024-01-01T00:00:00Z',
      })

    const stdout = await runCmd(CustomerGetCommand, ['100', '--output', 'json'])
    const output = JSON.parse(stdout)

    expect(output[0].id).toBe(100)
    expect(output[0].firstName).toBe('Alice')
    expect(output[0].organization).toBe('Acme Corp')
    expect(output[0].jobTitle).toBe('Engineer')
    expect(scope.isDone()).toBe(true)
  })

  it('renders customer details in table format', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/customers/100')
      .reply(200, {
        id: 100,
        firstName: 'Alice',
        lastName: 'Wong',
        emails: [{ id: 1, value: 'alice@example.com' }],
        organization: 'Acme Corp',
        jobTitle: 'Engineer',
        createdAt: '2024-01-01T00:00:00Z',
      })

    const stdout = await runCmd(CustomerGetCommand, [
      '100',
      '--output',
      'table',
    ])

    expect(stdout).toContain('Alice')
    expect(stdout).toContain('Wong')
    expect(stdout).toContain('alice@example.com')
    expect(stdout).toContain('Acme Corp')
    expect(scope.isDone()).toBe(true)
  })
})

it('handles customer without emails', async () => {
  nock('https://api.helpscout.net')
    .get('/v2/customers/1')
    .reply(200, { id: 1, firstName: 'No', lastName: 'Email' })
  const stdout = await runCmd(CustomerGetCommand, ['1', '--output', 'table'])
  expect(stdout).toContain('No')
})
