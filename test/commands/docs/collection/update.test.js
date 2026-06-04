import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const collection = JSON.parse(
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
  await import('../../../../src/commands/docs/collection/update.js')
const DOCS = 'https://docsapi.helpscout.net'
const ID = '5214c83d45667acd25394b53'

describe('hs docs collection update', () => {
  afterEach(() => nock.cleanAll())

  it('PUTs the collection and prints the updated result', async () => {
    const scope = nock(DOCS)
      .put(
        `/v1/collections/${ID}`,
        (b) => b.name === 'Renamed' && b.siteId === 'site2',
      )
      .query({ reload: 'true' })
      .reply(200, collection)
    const out = JSON.parse(
      await runCmd(Cmd, [
        ID,
        '--name',
        'Renamed',
        '--site',
        'site2',
        '--output',
        'json',
      ]),
    )
    expect(out.name).toBe('General')
    expect(scope.isDone()).toBe(true)
  })

  it('logs success when the API returns no body', async () => {
    nock(DOCS)
      .put(`/v1/collections/${ID}`)
      .query({ reload: 'true' })
      .reply(200, '')
    const out = await runCmd(Cmd, [ID, '--name', 'Renamed'])
    expect(out).toContain(`Updated collection ${ID}`)
  })
})
