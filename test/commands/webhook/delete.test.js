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

vi.mock('../../../src/lib/confirm.js', () => ({
  confirmAction: vi.fn().mockResolvedValue(true),
}))

const { default: WebhookDeleteCommand } =
  await import('../../../src/commands/webhook/delete.js')
const { confirmAction } = await import('../../../src/lib/confirm.js')

describe('hs webhook delete', () => {
  afterEach(() => nock.cleanAll())

  it('deletes a webhook when confirmed', async () => {
    const scope = nock('https://api.helpscout.net')
      .delete('/v2/webhooks/10')
      .reply(204)

    const stdout = await runCmd(WebhookDeleteCommand, ['10', '--yes'])

    expect(stdout).toContain('Deleted webhook #10')
    expect(scope.isDone()).toBe(true)
  })

  it('passes --yes flag to confirmAction', async () => {
    nock('https://api.helpscout.net').delete('/v2/webhooks/20').reply(204)

    await runCmd(WebhookDeleteCommand, ['20', '--yes'])

    expect(confirmAction).toHaveBeenCalledWith(
      'Delete webhook #20? This cannot be undone.',
      true,
    )
  })

  it('cancels when not confirmed', async () => {
    confirmAction.mockResolvedValueOnce(false)

    const stdout = await runCmd(WebhookDeleteCommand, ['30'])

    expect(stdout).toContain('Cancelled.')
    expect(stdout).not.toContain('Deleted')
  })
})
