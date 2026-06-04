import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(
    join(__dirname, '../../../fixtures/docs-articles-list.json'),
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
  await import('../../../../src/commands/docs/article/list.js')
const DOCS = 'https://docsapi.helpscout.net'
const CID = '5214c77c45667acd25394b51'
const CAT = '5214c77d45667acd25394b52'

describe('hs docs article list', () => {
  afterEach(() => nock.cleanAll())

  it('lists a collection’s articles as JSON', async () => {
    nock(DOCS)
      .get(`/v1/collections/${CID}/articles`)
      .query(true)
      .reply(200, fixture)
    const out = JSON.parse(
      await runCmd(Cmd, ['--collection', CID, '--output', 'json']),
    )
    expect(out).toHaveLength(2)
    expect(out[0].name).toBe('Getting started')
  })

  it('lists a category’s articles as JSON', async () => {
    nock(DOCS)
      .get(`/v1/categories/${CAT}/articles`)
      .query(true)
      .reply(200, fixture)
    const out = JSON.parse(
      await runCmd(Cmd, ['--category', CAT, '--output', 'json']),
    )
    expect(out).toHaveLength(2)
  })

  it('errors when neither --collection nor --category is given', async () => {
    await expect(Cmd.run([])).rejects.toThrow(/--collection .* or --category/)
  })
})
