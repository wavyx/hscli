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

const { default: WorkflowRunCommand } =
  await import('../../../src/commands/workflow/run.js')

describe('hs workflow run', () => {
  afterEach(() => nock.cleanAll())

  it('posts conversationIds array to the workflow run endpoint', async () => {
    const scope = nock('https://api.helpscout.net')
      .post('/v2/workflows/5/run', (body) => {
        return (
          Array.isArray(body.conversationIds) &&
          body.conversationIds.length === 3 &&
          body.conversationIds[0] === 100 &&
          body.conversationIds[1] === 200 &&
          body.conversationIds[2] === 300
        )
      })
      .reply(204)

    const stdout = await runCmd(WorkflowRunCommand, ['5', '--conv', '100,200,300'])

    expect(stdout).toContain('Workflow #5 executed successfully')
    expect(scope.isDone()).toBe(true)
  })

  it('handles a single conversation ID', async () => {
    const scope = nock('https://api.helpscout.net')
      .post('/v2/workflows/7/run', (body) => {
        return body.conversationIds.length === 1 && body.conversationIds[0] === 42
      })
      .reply(204)

    const stdout = await runCmd(WorkflowRunCommand, ['7', '--conv', '42'])

    expect(stdout).toContain('Workflow #7 executed successfully')
    expect(scope.isDone()).toBe(true)
  })
})
