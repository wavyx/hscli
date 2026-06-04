import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const created = JSON.parse(
  readFileSync(
    join(__dirname, '../../../fixtures/docs-article-created.json'),
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
  await import('../../../../src/commands/docs/article/create.js')
const DOCS = 'https://docsapi.helpscout.net'
const CID = '5214c77c45667acd25394b51'

describe('hs docs article create', () => {
  afterEach(() => nock.cleanAll())

  it('POSTs the article (reload=true) and prints the created article', async () => {
    const scope = nock(DOCS)
      .post(
        '/v1/articles',
        (b) =>
          b.collectionId === CID &&
          b.name === 'Test article' &&
          b.text === '<p>Body</p>' &&
          b.status === 'notpublished',
      )
      .query({ reload: 'true' })
      .reply(201, created)

    const out = JSON.parse(
      await runCmd(Cmd, [
        '--collection',
        CID,
        '--name',
        'Test article',
        '--text',
        '<p>Body</p>',
        '--output',
        'json',
      ]),
    )
    expect(out.id).toBe('5215163545667acd25394bff')
    expect(out.name).toBe('Test article')
    expect(scope.isDone()).toBe(true)
  })

  it('forwards --status, --categories and --keywords', async () => {
    const scope = nock(DOCS)
      .post(
        '/v1/articles',
        (b) =>
          b.status === 'published' &&
          Array.isArray(b.categories) &&
          b.categories[0] === 'cat1' &&
          b.keywords[1] === 'two',
      )
      .query({ reload: 'true' })
      .reply(201, created)

    await runCmd(Cmd, [
      '--collection',
      CID,
      '--name',
      'Test article',
      '--text',
      'x',
      '--status',
      'published',
      '--categories',
      'cat1, cat2',
      '--keywords',
      'one, two',
      '--output',
      'json',
    ])
    expect(scope.isDone()).toBe(true)
  })
})
