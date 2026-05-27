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

const { default: CustomerUpdateCommand } =
  await import('../../../src/commands/customer/update.js')

describe('hs customer update', () => {
  afterEach(() => nock.cleanAll())

  it('sends JSON Patch operations for provided flags', async () => {
    const scope = nock('https://api.helpscout.net')
      .patch('/v2/customers/42', (body) => {
        expect(body).toEqual(
          expect.arrayContaining([
            { op: 'replace', path: '/firstName', value: 'Jane' },
            { op: 'replace', path: '/lastName', value: 'Doe' },
          ]),
        )
        return true
      })
      .reply(204)

    const stdout = await runCmd(CustomerUpdateCommand, [
      '42',
      '--first',
      'Jane',
      '--last',
      'Doe',
    ])

    expect(stdout).toContain('Updated customer')
    expect(stdout).toContain('#42')
    expect(scope.isDone()).toBe(true)
  })

  it('sends email and phone as array values', async () => {
    const scope = nock('https://api.helpscout.net')
      .patch('/v2/customers/10', (body) => {
        expect(body).toEqual(
          expect.arrayContaining([
            {
              op: 'replace',
              path: '/emails',
              value: [{ value: 'new@example.com' }],
            },
            { op: 'replace', path: '/phones', value: [{ value: '555-9999' }] },
          ]),
        )
        return true
      })
      .reply(204)

    const stdout = await runCmd(CustomerUpdateCommand, [
      '10',
      '--email',
      'new@example.com',
      '--phone',
      '555-9999',
    ])

    expect(stdout).toContain('Updated customer')
    expect(stdout).toContain('#10')
    expect(scope.isDone()).toBe(true)
  })

  it('sends organization and job-title patches', async () => {
    const scope = nock('https://api.helpscout.net')
      .patch('/v2/customers/7', (body) => {
        expect(body).toEqual(
          expect.arrayContaining([
            { op: 'replace', path: '/organization', value: 'Globex' },
            { op: 'replace', path: '/jobTitle', value: 'CTO' },
          ]),
        )
        return true
      })
      .reply(204)

    const stdout = await runCmd(CustomerUpdateCommand, [
      '7',
      '--company',
      'Globex',
      '--job-title',
      'CTO',
    ])

    expect(stdout).toContain('Updated customer')
    expect(stdout).toContain('#7')
    expect(scope.isDone()).toBe(true)
  })

  it('logs message and returns when no flags are provided', async () => {
    const stdout = await runCmd(CustomerUpdateCommand, ['99'])

    expect(stdout).toContain('No fields to update.')
  })
})
