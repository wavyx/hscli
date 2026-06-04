import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const article = JSON.parse(
  readFileSync(
    join(__dirname, '../../../fixtures/docs-article-get.json'),
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
  await import('../../../../src/commands/docs/article/update.js')
const DOCS = 'https://docsapi.helpscout.net'
const ID = '5215163545667acd25394b5c'

describe('hs docs article update', () => {
  afterEach(() => nock.cleanAll())

  it('PUTs only the provided fields and prints the updated article', async () => {
    const scope = nock(DOCS)
      .put(
        `/v1/articles/${ID}`,
        (b) => b.status === 'published' && !('name' in b),
      )
      .query({ reload: 'true' })
      .reply(200, article)

    const out = JSON.parse(
      await runCmd(Cmd, [ID, '--status', 'published', '--output', 'json']),
    )
    expect(out.name).toBe('Getting started')
    expect(scope.isDone()).toBe(true)
  })

  it('logs success when the API returns no body', async () => {
    nock(DOCS)
      .put(`/v1/articles/${ID}`)
      .query({ reload: 'true' })
      .reply(200, '')
    const out = await runCmd(Cmd, [ID, '--name', 'Renamed'])
    expect(out).toContain(`Updated article ${ID}`)
  })

  it('updates text and slug together', async () => {
    const scope = nock(DOCS)
      .put(
        `/v1/articles/${ID}`,
        (b) => b.text === '<p>new</p>' && b.slug === 'new-slug',
      )
      .query({ reload: 'true' })
      .reply(200, article)
    await runCmd(Cmd, [
      ID,
      '--text',
      '<p>new</p>',
      '--slug',
      'new-slug',
      '--output',
      'json',
    ])
    expect(scope.isDone()).toBe(true)
  })

  it('errors when no fields are given', async () => {
    await expect(Cmd.run([ID])).rejects.toThrow(/at least one field/)
  })
})
