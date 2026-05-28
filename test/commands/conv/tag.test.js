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

const { default: ConvTagCommand } =
  await import('../../../src/commands/conv/tag.js')

describe('hs conv tag', () => {
  afterEach(() => nock.cleanAll())

  it('adds tags to a conversation via GET + PUT', async () => {
    const getScope = nock('https://api.helpscout.net')
      .get('/v2/conversations/123')
      .reply(200, { id: 123, tags: [{ tag: 'existing' }] })

    const putScope = nock('https://api.helpscout.net')
      .put('/v2/conversations/123/tags', (body) => {
        return (
          body.tags.length === 3 &&
          body.tags.includes('existing') &&
          body.tags.includes('billing') &&
          body.tags.includes('urgent')
        )
      })
      .reply(204)

    const stdout = await runCmd(ConvTagCommand, [
      '123',
      '--add',
      'billing,urgent',
    ])

    expect(stdout).toContain('Tags updated on conversation #123')
    expect(stdout).toContain('existing')
    expect(stdout).toContain('billing')
    expect(stdout).toContain('urgent')
    expect(getScope.isDone()).toBe(true)
    expect(putScope.isDone()).toBe(true)
  })

  it('removes tags from a conversation', async () => {
    const getScope = nock('https://api.helpscout.net')
      .get('/v2/conversations/200')
      .reply(200, { id: 200, tags: ['keep', 'remove-me', 'also-keep'] })

    const putScope = nock('https://api.helpscout.net')
      .put('/v2/conversations/200/tags', (body) => {
        return (
          body.tags.length === 2 &&
          body.tags.includes('keep') &&
          body.tags.includes('also-keep') &&
          !body.tags.includes('remove-me')
        )
      })
      .reply(204)

    const stdout = await runCmd(ConvTagCommand, [
      '200',
      '--remove',
      'remove-me',
    ])

    expect(stdout).toContain('Tags updated on conversation #200')
    expect(getScope.isDone()).toBe(true)
    expect(putScope.isDone()).toBe(true)
  })

  it('handles both add and remove in a single call', async () => {
    const getScope = nock('https://api.helpscout.net')
      .get('/v2/conversations/300')
      .reply(200, { id: 300, tags: [{ tag: 'old' }, { tag: 'keep' }] })

    const putScope = nock('https://api.helpscout.net')
      .put('/v2/conversations/300/tags', (body) => {
        return (
          body.tags.includes('keep') &&
          body.tags.includes('new') &&
          !body.tags.includes('old')
        )
      })
      .reply(204)

    const stdout = await runCmd(ConvTagCommand, [
      '300',
      '--add',
      'new',
      '--remove',
      'old',
    ])

    expect(stdout).toContain('Tags updated on conversation #300')
    expect(getScope.isDone()).toBe(true)
    expect(putScope.isDone()).toBe(true)
  })

  it('handles conversation with no existing tags', async () => {
    const getScope = nock('https://api.helpscout.net')
      .get('/v2/conversations/400')
      .reply(200, { id: 400 })

    const putScope = nock('https://api.helpscout.net')
      .put('/v2/conversations/400/tags', (body) => {
        return body.tags.length === 1 && body.tags[0] === 'new'
      })
      .reply(204)

    const stdout = await runCmd(ConvTagCommand, ['400', '--add', 'new'])

    expect(stdout).toContain('Tags updated')
    expect(getScope.isDone()).toBe(true)
    expect(putScope.isDone()).toBe(true)
  })

  it('does not duplicate when adding an already-present tag', async () => {
    const getScope = nock('https://api.helpscout.net')
      .get('/v2/conversations/600')
      .reply(200, { id: 600, tags: ['billing'] })

    const putScope = nock('https://api.helpscout.net')
      .put('/v2/conversations/600/tags', (body) => {
        return body.tags.length === 1 && body.tags[0] === 'billing'
      })
      .reply(204)

    const stdout = await runCmd(ConvTagCommand, ['600', '--add', 'billing'])
    expect(stdout).toContain('Tags updated')
    expect(getScope.isDone()).toBe(true)
    expect(putScope.isDone()).toBe(true)
  })

  it('shows empty tags when all removed', async () => {
    const getScope = nock('https://api.helpscout.net')
      .get('/v2/conversations/500')
      .reply(200, { id: 500, tags: ['only'] })

    const putScope = nock('https://api.helpscout.net')
      .put('/v2/conversations/500/tags', (body) => body.tags.length === 0)
      .reply(204)

    const stdout = await runCmd(ConvTagCommand, ['500', '--remove', 'only'])

    expect(stdout).toContain('Tags updated')
    expect(getScope.isDone()).toBe(true)
    expect(putScope.isDone()).toBe(true)
  })
})
