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

const { default: CustomerCreateCommand } =
  await import('../../../src/commands/customer/create.js')

describe('hs customer create', () => {
  afterEach(() => nock.cleanAll())

  it('creates a customer with email only', async () => {
    const scope = nock('https://api.helpscout.net')
      .post('/v2/customers', (body) => {
        expect(body.emails).toEqual([{ value: 'alice@example.com' }])
        expect(body.firstName).toBeUndefined()
        expect(body.lastName).toBeUndefined()
        return true
      })
      .reply(201, { id: 999 })

    const stdout = await runCmd(CustomerCreateCommand, [
      '--email', 'alice@example.com',
    ])

    expect(stdout).toContain('Created customer')
    expect(stdout).toContain('999')
    expect(scope.isDone()).toBe(true)
  })

  it('includes optional fields when provided', async () => {
    const scope = nock('https://api.helpscout.net')
      .post('/v2/customers', (body) => {
        expect(body.emails).toEqual([{ value: 'bob@example.com' }])
        expect(body.firstName).toBe('Bob')
        expect(body.lastName).toBe('Smith')
        expect(body.organization).toBe('Acme')
        expect(body.phones).toEqual([{ value: '555-1234' }])
        expect(body.jobTitle).toBe('Engineer')
        return true
      })
      .reply(201, { id: 1001 })

    const stdout = await runCmd(CustomerCreateCommand, [
      '--email', 'bob@example.com',
      '--first', 'Bob',
      '--last', 'Smith',
      '--company', 'Acme',
      '--phone', '555-1234',
      '--job-title', 'Engineer',
    ])

    expect(stdout).toContain('Created customer')
    expect(stdout).toContain('1001')
    expect(scope.isDone()).toBe(true)
  })

  it('outputs JSON when --output json is set', async () => {
    nock('https://api.helpscout.net')
      .post('/v2/customers')
      .reply(201, { id: 500 })

    const stdout = await runCmd(CustomerCreateCommand, [
      '--email', 'json@example.com',
      '--output', 'json',
    ])

    expect(stdout).toContain('Created customer')
    expect(stdout).toContain('"id": 500')
  })
})
