import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(
    join(__dirname, '../../../fixtures/docs-collection-get.json'),
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
  await import('../../../../src/commands/docs/collection/get.js')
const DOCS = 'https://docsapi.helpscout.net'

describe('hs docs collection get', () => {
  afterEach(() => nock.cleanAll())

  it('returns a single collection as JSON', async () => {
    nock(DOCS).get('/v1/collections/33').reply(200, fixture)
    const out = JSON.parse(await runCmd(Cmd, ['33', '--output', 'json']))
    expect(out.name).toBe('General')
    expect(out.id).toBe('5214c83d45667acd25394b53')
  })

  it('renders the collection in a table', async () => {
    nock(DOCS).get('/v1/collections/33').reply(200, fixture)
    const out = await runCmd(Cmd, ['33', '--output', 'table'])
    expect(out).toContain('General')
  })
})
