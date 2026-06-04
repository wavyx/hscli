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
  await import('../../../../src/commands/docs/category/update.js')
const DOCS = 'https://docsapi.helpscout.net'
const ID = '5214c77d45667acd25394bff'

describe('hs docs category update', () => {
  afterEach(() => nock.cleanAll())

  it('PUTs the category and prints the updated result', async () => {
    const scope = nock(DOCS)
      .put(`/v1/categories/${ID}`, (b) => b.name === 'Renamed' && b.order === 5)
      .query({ reload: 'true' })
      .reply(200, category)
    const out = JSON.parse(
      await runCmd(Cmd, [
        ID,
        '--name',
        'Renamed',
        '--order',
        '5',
        '--output',
        'json',
      ]),
    )
    expect(out.name).toBe('Billing')
    expect(scope.isDone()).toBe(true)
  })

  it('logs success when the API returns no body', async () => {
    nock(DOCS)
      .put(`/v1/categories/${ID}`)
      .query({ reload: 'true' })
      .reply(200, '')
    const out = await runCmd(Cmd, [ID, '--name', 'Renamed'])
    expect(out).toContain(`Updated category ${ID}`)
  })
})
