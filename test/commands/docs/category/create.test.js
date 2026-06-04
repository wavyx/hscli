import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const category = JSON.parse(
  readFileSync(
    join(__dirname, '../../../fixtures/docs-category-created.json'),
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
  await import('../../../../src/commands/docs/category/create.js')
const DOCS = 'https://docsapi.helpscout.net'

describe('hs docs category create', () => {
  afterEach(() => nock.cleanAll())

  it('POSTs the category with reload and prints the result', async () => {
    const scope = nock(DOCS)
      .post(
        '/v1/categories',
        (b) =>
          b.collectionId === 'col1' &&
          b.name === 'Billing' &&
          b.visibility === 'public' &&
          b.order === 3,
      )
      .query({ reload: 'true' })
      .reply(201, category)

    const out = JSON.parse(
      await runCmd(Cmd, [
        '--collection',
        'col1',
        '--name',
        'Billing',
        '--visibility',
        'public',
        '--order',
        '3',
        '--output',
        'json',
      ]),
    )
    expect(out.name).toBe('Billing')
    expect(scope.isDone()).toBe(true)
  })

  it('omits optional fields when not provided', async () => {
    const scope = nock(DOCS)
      .post('/v1/categories', (b) => !('visibility' in b) && !('order' in b))
      .query({ reload: 'true' })
      .reply(201, category)
    await runCmd(Cmd, ['--collection', 'col1', '--name', 'Billing'])
    expect(scope.isDone()).toBe(true)
  })
})
