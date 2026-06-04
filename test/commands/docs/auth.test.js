import nock from 'nock'
import { runCmd } from '../../helpers.js'

vi.mock('../../../src/lib/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({ activeProfile: 'default' }),
  getProfileConfig: vi.fn().mockReturnValue(undefined),
}))

vi.mock('../../../src/lib/keychain.js', () => ({
  getTokens: vi.fn(),
  setTokens: vi.fn(),
  deleteTokens: vi.fn(),
  isKeychainAvailable: vi.fn().mockReturnValue(true),
  setDocsKey: vi.fn().mockResolvedValue(undefined),
  getDocsKey: vi.fn(),
  deleteDocsKey: vi.fn(),
}))

vi.mock('@inquirer/prompts', () => ({
  password: vi.fn().mockResolvedValue('prompted-key'),
}))

const { setDocsKey } = await import('../../../src/lib/keychain.js')
const { password } = await import('@inquirer/prompts')
const { default: Cmd } = await import('../../../src/commands/docs/auth.js')
const DOCS = 'https://docsapi.helpscout.net'

describe('hs docs auth', () => {
  afterEach(() => {
    nock.cleanAll()
    vi.clearAllMocks()
  })

  it('validates and stores a key passed via --api-key', async () => {
    nock(DOCS)
      .get('/v1/sites')
      .reply(200, { sites: { items: [] } })
    const out = await runCmd(Cmd, ['--api-key', 'mykey'])
    expect(setDocsKey).toHaveBeenCalledWith('default', 'mykey')
    expect(password).not.toHaveBeenCalled()
    expect(out).toContain('stored')
  })

  it('prompts for the key when no flag/env is set', async () => {
    delete process.env.HSCLI_DOCS_API_KEY
    nock(DOCS)
      .get('/v1/sites')
      .reply(200, { sites: { items: [] } })
    await runCmd(Cmd, [])
    expect(password).toHaveBeenCalled()
    expect(setDocsKey).toHaveBeenCalledWith('default', 'prompted-key')
  })

  it('does not store the key when validation fails', async () => {
    nock(DOCS).get('/v1/sites').reply(401, { error: 'Invalid API Key' })
    await runCmd(Cmd, ['--api-key', 'bad'])
    expect(setDocsKey).not.toHaveBeenCalled()
  })

  it('errors when no key is provided at all', async () => {
    delete process.env.HSCLI_DOCS_API_KEY
    password.mockResolvedValueOnce('')
    await expect(Cmd.run([])).rejects.toThrow(/No Docs API key/)
    expect(setDocsKey).not.toHaveBeenCalled()
  })
})
