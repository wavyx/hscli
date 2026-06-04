import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(
    join(__dirname, '../../../fixtures/docs-sites-list.json'),
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
  await import('../../../../src/commands/docs/site/list.js')
const DOCS = 'https://docsapi.helpscout.net'

describe('hs docs site list', () => {
  afterEach(() => nock.cleanAll())

  it('returns sites as a JSON array', async () => {
    nock(DOCS).get('/v1/sites').query(true).reply(200, fixture)
    const out = JSON.parse(await runCmd(Cmd, ['--output', 'json']))
    expect(out).toHaveLength(2)
    expect(out[0].title).toBe('Acme Docs')
  })

  it('renders site titles in a table', async () => {
    nock(DOCS).get('/v1/sites').query(true).reply(200, fixture)
    const out = await runCmd(Cmd, ['--output', 'table'])
    expect(out).toContain('Acme Docs')
    expect(out).toContain('acme')
  })
})
