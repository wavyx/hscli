import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(
  join(__dirname, '../../../fixtures/docs-article-body.html'),
  'utf8',
)

vi.mock('../../../../src/lib/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({ activeProfile: 'default' }),
  getProfileConfig: vi.fn().mockReturnValue(undefined),
}))
vi.mock('../../../../src/lib/docs-auth.js', () => ({
  resolveDocsKey: vi.fn().mockReturnValue({ apiKey: 'k', source: 'env' }),
}))

const { default: Cmd } =
  await import('../../../../src/commands/docs/article/save-draft.js')
const DOCS = 'https://docsapi.helpscout.net'
const ID = '5215163545667acd25394b5c'

describe('hs docs article save-draft', () => {
  afterEach(() => nock.cleanAll())

  it('PUTs the draft text and logs success', async () => {
    const scope = nock(DOCS)
      .put(`/v1/articles/${ID}/drafts`, (b) => b.text === '<p>draft</p>')
      .reply(200, '')
    const out = await runCmd(Cmd, [ID, '--text', '<p>draft</p>'])
    expect(out).toContain(`Saved draft for article ${ID}`)
    expect(scope.isDone()).toBe(true)
  })

  it('reads the draft body from a @file', async () => {
    const scope = nock(DOCS)
      .put(`/v1/articles/${ID}/drafts`, (b) => b.text === html)
      .reply(200, '')
    await runCmd(Cmd, [ID, '--text', '@test/fixtures/docs-article-body.html'])
    expect(scope.isDone()).toBe(true)
  })
})
