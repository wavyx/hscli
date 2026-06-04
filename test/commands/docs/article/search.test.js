import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(
    join(__dirname, '../../../fixtures/docs-articles-search.json'),
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
  await import('../../../../src/commands/docs/article/search.js')
const DOCS = 'https://docsapi.helpscout.net'

describe('hs docs article search', () => {
  afterEach(() => nock.cleanAll())

  it('passes the query and returns matches as JSON', async () => {
    const scope = nock(DOCS)
      .get('/v1/search/articles')
      .query((q) => q.query === 'password' && q.page === '1')
      .reply(200, fixture)
    const out = JSON.parse(await runCmd(Cmd, ['password', '--output', 'json']))
    expect(out).toHaveLength(2)
    expect(out[0].name).toBe('Getting started')
    expect(scope.isDone()).toBe(true)
  })

  it('forwards --collection as collectionId', async () => {
    const scope = nock(DOCS)
      .get('/v1/search/articles')
      .query((q) => q.query === 'refund' && q.collectionId === 'c1')
      .reply(200, fixture)
    await runCmd(Cmd, ['refund', '--collection', 'c1', '--output', 'json'])
    expect(scope.isDone()).toBe(true)
  })
})
