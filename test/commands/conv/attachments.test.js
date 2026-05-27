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

const { default: ConvAttachmentsCommand } =
  await import('../../../src/commands/conv/attachments.js')

describe('hs conv attachments', () => {
  afterEach(() => nock.cleanAll())

  it('extracts attachments from _embedded in threads', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/100/threads')
      .reply(200, {
        _embedded: {
          threads: [
            {
              id: 1,
              _embedded: {
                attachments: [
                  {
                    id: 10,
                    filename: 'invoice.pdf',
                    mimeType: 'application/pdf',
                    size: 12345,
                    width: null,
                    height: null,
                  },
                ],
              },
            },
            {
              id: 2,
              _embedded: {
                attachments: [
                  {
                    id: 11,
                    filename: 'screenshot.png',
                    mimeType: 'image/png',
                    size: 54321,
                    width: 800,
                    height: 600,
                  },
                ],
              },
            },
          ],
        },
      })

    const stdout = await runCmd(ConvAttachmentsCommand, [
      '100',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output[0].filename).toBe('invoice.pdf')
    expect(output[1].filename).toBe('screenshot.png')
    expect(scope.isDone()).toBe(true)
  })

  it('falls back to thread.attachments when _embedded has none', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/100/threads')
      .reply(200, {
        _embedded: {
          threads: [
            {
              id: 1,
              attachments: [
                {
                  id: 20,
                  filename: 'doc.txt',
                  mimeType: 'text/plain',
                  size: 100,
                  width: null,
                  height: null,
                },
              ],
            },
          ],
        },
      })

    const stdout = await runCmd(ConvAttachmentsCommand, [
      '100',
      '--output',
      'json',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(1)
    expect(output[0].filename).toBe('doc.txt')
    expect(scope.isDone()).toBe(true)
  })

  it('shows no results when no attachments exist', async () => {
    const scope = nock('https://api.helpscout.net')
      .get('/v2/conversations/100/threads')
      .reply(200, {
        _embedded: {
          threads: [{ id: 1, type: 'note', body: 'No files here' }],
        },
      })

    const stdout = await runCmd(ConvAttachmentsCommand, [
      '100',
      '--output',
      'table',
    ])

    expect(stdout).toContain('No results')
    expect(scope.isDone()).toBe(true)
  })
})
