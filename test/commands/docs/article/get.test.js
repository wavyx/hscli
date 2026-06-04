import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(
    join(__dirname, '../../../fixtures/docs-article-get.json'),
    'utf8',
  ),
)

vi.mock('../../../../src/lib/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({ activeProfile: 'default' }),
  getProfileConfig: vi.fn().mockReturnValue(undefined),
}))
vi.mock('../../../../src/lib/docs-auth.js', () => ({
  resolveDocsKey: vi.fn().mockReturnValue({ apiKey: 'k', source: 'env' }),
}))

const { default: Cmd } =
  await import('../../../../src/commands/docs/article/get.js')
const DOCS = 'https://docsapi.helpscout.net'
const ID = '5215163545667acd25394b5c'

describe('hs docs article get', () => {
  afterEach(() => nock.cleanAll())

  it('returns a single article as JSON (including body text)', async () => {
    nock(DOCS).get(`/v1/articles/${ID}`).reply(200, fixture)
    const out = JSON.parse(await runCmd(Cmd, [ID, '--output', 'json']))
    expect(out.name).toBe('Getting started')
    expect(out.text).toContain('Welcome')
  })

  it('renders the article in a table', async () => {
    nock(DOCS).get(`/v1/articles/${ID}`).reply(200, fixture)
    const out = await runCmd(Cmd, [ID, '--output', 'table'])
    expect(out).toContain('Getting started')
  })
})
