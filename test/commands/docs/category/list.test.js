import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(
    join(__dirname, '../../../fixtures/docs-categories-list.json'),
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
  await import('../../../../src/commands/docs/category/list.js')
const DOCS = 'https://docsapi.helpscout.net'
const CID = '5214c83d45667acd25394b53'

describe('hs docs category list', () => {
  afterEach(() => nock.cleanAll())

  it('returns categories for a collection as JSON', async () => {
    nock(DOCS)
      .get(`/v1/collections/${CID}/categories`)
      .query(true)
      .reply(200, fixture)
    const out = JSON.parse(await runCmd(Cmd, [CID, '--output', 'json']))
    expect(out).toHaveLength(2)
    expect(out[0].name).toBe('Getting Started')
  })

  it('renders category names in a table', async () => {
    nock(DOCS)
      .get(`/v1/collections/${CID}/categories`)
      .query(true)
      .reply(200, fixture)
    const out = await runCmd(Cmd, [CID, '--output', 'table'])
    expect(out).toContain('Getting Started')
    expect(out).toContain('Billing')
  })
})
