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

const { default: ConvExportCommand } =
  await import('../../../src/commands/conv/export.js')

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

describe('hs conv export', () => {
  afterEach(() => nock.cleanAll())

  it('exports conversations as JSON by default', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(ConvExportCommand, [])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output[0].subject).toBe('Need help with billing')
    expect(output[1].subject).toBe('API integration question')
    expect(scope.isDone()).toBe(true)
  })

  it('exports conversations as CSV', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(ConvExportCommand, ['--format', 'csv'])

    expect(stdout).toContain('ID,Number,Subject,Status,Mailbox,Created')
    expect(stdout).toContain('Need help with billing')
    expect(stdout).toContain('API integration question')
    expect(scope.isDone()).toBe(true)
  })

  it('exports conversations as NDJSON', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, fixture)

    const stdout = await runCmd(ConvExportCommand, ['--format', 'ndjson'])
    const lines = stdout.split('\n').filter((l) => l.startsWith('{'))

    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0]).subject).toBe('Need help with billing')
    expect(JSON.parse(lines[1]).subject).toBe('API integration question')
    expect(scope.isDone()).toBe(true)
  })

  it('passes mailbox filter to API', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => q.mailbox === '42')
      .reply(200, fixture)

    const stdout = await runCmd(ConvExportCommand, [
      '--mailbox',
      '42',
      '--format',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })

  it('passes status filter to API', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => q.status === 'closed')
      .reply(200, fixture)

    const stdout = await runCmd(ConvExportCommand, [
      '--status',
      'closed',
      '--format',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })

  it('paginates through multiple pages', async () => {
    const page1 = {
      _embedded: {
        conversations: [
          {
            id: 100,
            number: 1001,
            subject: 'First',
            status: 'active',
            mailboxId: 42,
            createdAt: '2024-06-15T09:00:00Z',
          },
        ],
      },
      page: { size: 1, totalElements: 2, totalPages: 2, number: 1 },
    }

    const page2 = {
      _embedded: {
        conversations: [
          {
            id: 101,
            number: 1002,
            subject: 'Second',
            status: 'active',
            mailboxId: 42,
            createdAt: '2024-06-14T14:30:00Z',
          },
        ],
      },
      page: { size: 1, totalElements: 2, totalPages: 2, number: 2 },
    }

    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => q.page === '1')
      .reply(200, page1)
      .get('/v2/conversations')
      .query((q) => q.page === '2')
      .reply(200, page2)

    const stdout = await runCmd(ConvExportCommand, ['--format', 'json'])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(output[0].subject).toBe('First')
    expect(output[1].subject).toBe('Second')
    expect(scope.isDone()).toBe(true)
  })

  it('handles empty result set', async () => {
    const emptyFixture = {
      _embedded: { conversations: [] },
      page: { size: 25, totalElements: 0, totalPages: 1, number: 1 },
    }

    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, emptyFixture)

    const stdout = await runCmd(ConvExportCommand, ['--format', 'json'])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(0)
    expect(scope.isDone()).toBe(true)
  })

  it('handles response with no _embedded and no page metadata', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(true)
      .reply(200, {})

    const stdout = await runCmd(ConvExportCommand, ['--format', 'json'])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(0)
    expect(scope.isDone()).toBe(true)
  })

  it('parses --since 7d into an ISO modifiedSince', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(
        (q) =>
          typeof q.modifiedSince === 'string' &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(q.modifiedSince),
      )
      .reply(200, fixture)

    const stdout = await runCmd(ConvExportCommand, [
      '--since',
      '7d',
      '--format',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })

  it('parses --since 2h into an ISO modifiedSince', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(
        (q) =>
          typeof q.modifiedSince === 'string' &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(q.modifiedSince),
      )
      .reply(200, fixture)

    const stdout = await runCmd(ConvExportCommand, [
      '--since',
      '2h',
      '--format',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })

  it('parses --since 30m into an ISO modifiedSince', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query(
        (q) =>
          typeof q.modifiedSince === 'string' &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(q.modifiedSince),
      )
      .reply(200, fixture)

    const stdout = await runCmd(ConvExportCommand, [
      '--since',
      '30m',
      '--format',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })

  it('passes --embed values as repeated query params', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => {
        const values = [].concat(q.embed)
        return values.includes('threads') && values.includes('customers')
      })
      .reply(200, fixture)

    const stdout = await runCmd(ConvExportCommand, [
      '--embed',
      'threads,customers',
      '--format',
      'json',
    ])
    const output = JSON.parse(stdout)
    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })

  it('rejects unknown --embed values', async () => {
    let captured
    try {
      await ConvExportCommand.run(['--embed', 'bogus', '--format', 'json'])
    } catch (e) {
      captured = e
    }
    expect(captured).toBeDefined()
    expect(captured.message).toMatch(/embed.*bogus/i)
  })

  it('rejects --embed combined with --format csv', async () => {
    let captured
    try {
      await ConvExportCommand.run(['--embed', 'threads', '--format', 'csv'])
    } catch (e) {
      captured = e
    }
    expect(captured).toBeDefined()
    expect(captured.message).toMatch(/embed.*csv/i)
  })

  it('passes through --since as ISO date when not relative', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations')
      .query((q) => q.modifiedSince === '2024-01-01T00:00:00Z')
      .reply(200, fixture)

    const stdout = await runCmd(ConvExportCommand, [
      '--since',
      '2024-01-01T00:00:00Z',
      '--format',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(2)
    expect(scope.isDone()).toBe(true)
  })
})
