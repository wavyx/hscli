import nock from 'nock'
import { runCmd } from '../helpers.js'

vi.mock('../../src/lib/keychain.js', () => ({
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

vi.mock('../../src/lib/config.js', () => ({
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

vi.mock('../../src/lib/auth.js', () => ({
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

vi.mock('../../src/lib/body.js', () => ({
  resolveBody: vi.fn().mockResolvedValue('{"subject":"test"}'),
}))

const { default: ApiCommand } =
  await import('../../src/commands/api.js')

describe('hs api', () => {
  afterEach(() => nock.cleanAll())

  it('passes through a GET request and outputs JSON', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .reply(200, { id: 1, subject: 'Test' })

    const stdout = await runCmd(ApiCommand, ['GET', '/v2/conversations'])
    const output = JSON.parse(stdout)

    expect(output.id).toBe(1)
    expect(output.subject).toBe('Test')
    expect(scope.isDone()).toBe(true)
  })

  it('passes through a POST request with body', async () => {
    const scope = nock('https://api.helpscout.net')
      .post('/v2/conversations', (body) => body.subject === 'test')
      .reply(201, { id: 99 })

    const stdout = await runCmd(ApiCommand, [
      'POST', '/v2/conversations',
      '--body', '{"subject":"test"}',
    ])
    const output = JSON.parse(stdout)

    expect(output.id).toBe(99)
    expect(scope.isDone()).toBe(true)
  })

  it('handles DELETE returning 204', async () => {
    const scope = nock('https://api.helpscout.net')
      .delete('/v2/webhooks/1')
      .reply(204)

    const stdout = await runCmd(ApiCommand, ['DELETE', '/v2/webhooks/1'])

    expect(stdout).toBe('')
    expect(scope.isDone()).toBe(true)
  })
})
