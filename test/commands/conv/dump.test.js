import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

const { default: ConvDumpCommand } = await import(
  '../../../src/commands/conv/dump.js'
)

const fixtureConv = {
  id: 123,
  number: 4567,
  subject: 'Need help',
  status: 'active',
  mailboxId: 42,
  createdAt: '2024-06-15T09:00:00Z',
  _embedded: {
    threads: [
      {
        id: 9001,
        type: 'customer',
        body: '<p>Hello</p>',
        createdAt: '2024-06-15T09:00:00Z',
        attachments: [
          {
            id: 555,
            filename: 'screenshot.png',
            mimeType: 'image/png',
            size: 12345,
            _links: { data: { href: '/v2/attachments/555/data' } },
          },
        ],
      },
      {
        id: 9002,
        type: 'message',
        body: '<p>Thanks for reaching out</p>',
        createdAt: '2024-06-15T09:10:00Z',
      },
    ],
    customers: [{ id: 7001, firstName: 'Eric', email: 'customer@example.com' }],
    tags: [{ id: 1, color: '#abc', tag: 'billing' }],
  },
}

describe('hs conv dump', () => {
  let tmp
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'hsdump-'))
  })
  afterEach(() => {
    nock.cleanAll()
    rmSync(tmp, { recursive: true, force: true })
  })

  it('dumps conversation with threads, customers, tags, attachments to stdout', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/123')
      .query((q) => {
        const v = [].concat(q.embed)
        return (
          v.includes('threads') && v.includes('customers') && v.includes('tags')
        )
      })
      .reply(200, fixtureConv)

    const stdout = await runCmd(ConvDumpCommand, ['123'])
    const out = JSON.parse(stdout)

    expect(out.conversation.id).toBe(123)
    expect(out.conversation._embedded).toBeUndefined()
    expect(out.threads).toHaveLength(2)
    expect(out.customers).toHaveLength(1)
    expect(out.tags).toHaveLength(1)
    expect(out.attachments).toHaveLength(1)
    expect(out.attachments[0].filename).toBe('screenshot.png')
    expect(out.attachments[0].threadId).toBe(9001)
    expect(out.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(out.hscliVersion).toBeTruthy()
    expect(scope.isDone()).toBe(true)
  })

  it('writes to file when --out specified', async () => {
    nock('https://api.helpscout.net')
      .get('/v2/conversations/123')
      .query(true)
      .reply(200, fixtureConv)

    const file = join(tmp, 'conv-123.json')
    await runCmd(ConvDumpCommand, ['123', '--out', file])
    const out = JSON.parse(readFileSync(file, 'utf8'))
    expect(out.conversation.id).toBe(123)
    expect(out.threads).toHaveLength(2)
  })

  it('handles conversation with no embedded data gracefully', async () => {
    nock('https://api.helpscout.net')
      .get('/v2/conversations/999')
      .query(true)
      .reply(200, { id: 999, subject: 'Empty' })

    const stdout = await runCmd(ConvDumpCommand, ['999'])
    const out = JSON.parse(stdout)
    expect(out.threads).toEqual([])
    expect(out.customers).toEqual([])
    expect(out.tags).toEqual([])
    expect(out.attachments).toEqual([])
  })

  it('handles thread with no attachments', async () => {
    const conv = {
      id: 555,
      _embedded: {
        threads: [{ id: 1, type: 'customer', body: 'hi' }],
      },
    }
    nock('https://api.helpscout.net')
      .get('/v2/conversations/555')
      .query(true)
      .reply(200, conv)

    const stdout = await runCmd(ConvDumpCommand, ['555'])
    const out = JSON.parse(stdout)
    expect(out.attachments).toEqual([])
  })
})
