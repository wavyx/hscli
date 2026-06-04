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
  await import('../../../../src/commands/docs/collection/create.js')
const DOCS = 'https://docsapi.helpscout.net'

describe('hs docs collection create', () => {
  afterEach(() => nock.cleanAll())

  it('POSTs the collection with reload and prints the result', async () => {
    const scope = nock(DOCS)
      .post(
        '/v1/collections',
        (b) =>
          b.siteId === 'site1' &&
          b.name === 'General' &&
          b.visibility === 'private' &&
          b.order === 2,
      )
      .query({ reload: 'true' })
      .reply(201, collection)

    const out = JSON.parse(
      await runCmd(Cmd, [
        '--site',
        'site1',
        '--name',
        'General',
        '--visibility',
        'private',
        '--order',
        '2',
        '--output',
        'json',
      ]),
    )
    expect(out.name).toBe('General')
    expect(scope.isDone()).toBe(true)
  })

  it('omits optional fields when not provided', async () => {
    const scope = nock(DOCS)
      .post('/v1/collections', (b) => !('visibility' in b) && !('order' in b))
      .query({ reload: 'true' })
      .reply(201, collection)
    await runCmd(Cmd, ['--site', 'site1', '--name', 'General'])
    expect(scope.isDone()).toBe(true)
  })
})
