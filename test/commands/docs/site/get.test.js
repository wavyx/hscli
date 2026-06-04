import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(join(__dirname, '../../../fixtures/docs-site-get.json'), 'utf8'),
)

vi.mock('../../../../src/lib/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({ activeProfile: 'default' }),
  getProfileConfig: vi.fn().mockReturnValue(undefined),
}))
vi.mock('../../../../src/lib/docs-auth.js', () => ({
  resolveDocsKey: vi.fn().mockReturnValue({ apiKey: 'k', source: 'env' }),
}))

const { default: Cmd } =
  await import('../../../../src/commands/docs/site/get.js')
const DOCS = 'https://docsapi.helpscout.net'
const ID = '566807879033603f7da26a9d'

describe('hs docs site get', () => {
  afterEach(() => nock.cleanAll())

  it('returns a single site as JSON', async () => {
    nock(DOCS).get(`/v1/sites/${ID}`).reply(200, fixture)
    const out = JSON.parse(await runCmd(Cmd, [ID, '--output', 'json']))
    expect(out.title).toBe('Acme Docs')
    expect(out.subDomain).toBe('acme')
  })

  it('renders the site in a table', async () => {
    nock(DOCS).get(`/v1/sites/${ID}`).reply(200, fixture)
    const out = await runCmd(Cmd, [ID, '--output', 'table'])
    expect(out).toContain('Acme Docs')
  })
})
