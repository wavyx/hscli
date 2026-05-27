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

const { default: ConvBulkStatusCommand } =
  await import('../../../src/commands/conv/bulk-status.js')
const { confirmAction } = await import('../../../src/lib/confirm.js')

const fixture = {
  _embedded: {
    conversations: [
      {
        id: 100,
        number: 1001,
        subject: 'Need help with billing',
        status: 'active',
        mailboxId: 42,
        createdAt: '2024-06-15T09:00:00Z',
      },
      {
        id: 101,
        number: 1002,
        subject: 'API integration question',
        status: 'active',
        mailboxId: 42,
        createdAt: '2024-06-14T14:30:00Z',
      },
    ],
  },
  page: { size: 25, totalElements: 2, totalPages: 1, number: 1 },
}

describe('hs conv bulk-status', () => {
  afterEach(() => nock.cleanAll())

  it('updates status on all matching conversations', async () => {
    const listScope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    const patch1 = nock('https://api.helpscout.net')
      .patch('/v2/conversations/100', (body) => {
        return (
          body.op === 'replace' &&
          body.path === '/status' &&
          body.value === 'closed'
        )
      })
      .reply(204)

    const patch2 = nock('https://api.helpscout.net')
      .patch('/v2/conversations/101', (body) => {
        return body.value === 'closed'
      })
      .reply(204)

    const stdout = await runCmd(ConvBulkStatusCommand, [
      '--set',
      'closed',
      '--yes',
    ])

    expect(stdout).toContain('Found 2 conversations to update')
    expect(stdout).toContain('Updated 1/2...')
    expect(stdout).toContain('Updated 2/2...')
    expect(stdout).toContain('Updated 2 conversations to closed')
    expect(listScope.isDone()).toBe(true)
    expect(patch1.isDone()).toBe(true)
    expect(patch2.isDone()).toBe(true)
  })

  it('passes --yes flag to confirmAction', async () => {
    nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    nock('https://api.helpscout.net').patch('/v2/conversations/100').reply(204)
    nock('https://api.helpscout.net').patch('/v2/conversations/101').reply(204)

    await runCmd(ConvBulkStatusCommand, ['--set', 'closed', '--yes'])

    expect(confirmAction).toHaveBeenCalledWith(
      'Change status to "closed" for 2 conversations?',
      true,
    )
  })

  it('cancels when not confirmed', async () => {
    nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    confirmAction.mockResolvedValueOnce(false)

    const stdout = await runCmd(ConvBulkStatusCommand, ['--set', 'pending'])

    expect(stdout).toContain('Cancelled.')
    expect(stdout).not.toContain('Updated 2 conversations')
  })

  it('shows message when no conversations match', async () => {
    const emptyFixture = {
      _embedded: { conversations: [] },
      page: { size: 25, totalElements: 0, totalPages: 1, number: 1 },
    }

    nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, emptyFixture)

    const stdout = await runCmd(ConvBulkStatusCommand, [
      '--set',
      'closed',
      '--yes',
    ])

    expect(stdout).toContain('No conversations found matching filters.')
  })

  it('passes mailbox and tag filters to API', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => q.mailbox === '42' && q.tag === 'vip')
      .reply(200, fixture)

    nock('https://api.helpscout.net').patch('/v2/conversations/100').reply(204)
    nock('https://api.helpscout.net').patch('/v2/conversations/101').reply(204)

    await runCmd(ConvBulkStatusCommand, [
      '--mailbox',
      '42',
      '--tag',
      'vip',
      '--set',
      'active',
      '--yes',
    ])

    expect(scope.isDone()).toBe(true)
  })
})
