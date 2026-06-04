import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { runCmd } from '../../../helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(
    join(__dirname, '../../../fixtures/docs-collections-list.json'),
    'utf8',
  ),
)

vi.mock('../../../../src/lib/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({ activeProfile: 'default' }),
  getProfileConfig: vi.fn().mockReturnValue(undefined),
}))

vi.mock('../../../../src/lib/docs-auth.js', () => ({
  resolveDocsKey: vi
    .fn()
    .mockReturnValue({ apiKey: 'test-docs-key', source: 'env' }),
}))

const { default: DocsCollectionListCommand } =
  await import('../../../../src/commands/docs/collection/list.js')

const DOCS_BASE = 'https://docsapi.helpscout.net'

describe('hs docs collection list', () => {
  afterEach(() => nock.cleanAll())

  it('sends Basic auth (api key as user, dummy password) to the Docs host', async () => {
    const scope = nock(DOCS_BASE, {
      reqheaders: {
        authorization: `Basic ${Buffer.from('test-docs-key:X').toString('base64')}`,
      },
    })
      .get('/v1/collections')
      .query(true)
      .reply(200, fixture)

    await runCmd(DocsCollectionListCommand, ['--output', 'json'])
    expect(scope.isDone()).toBe(true)
  })

  it('returns collections as a JSON array', async () => {
    nock(DOCS_BASE).get('/v1/collections').query(true).reply(200, fixture)

    const stdout = await runCmd(DocsCollectionListCommand, ['--output', 'json'])
    const output = JSON.parse(stdout)

    expect(Array.isArray(output)).toBe(true)
    expect(output).toHaveLength(2)
    expect(output[0].name).toBe('General')
    expect(output[1].name).toBe('Foire aux Questions')
  })

  it('renders collection names in table format', async () => {
    nock(DOCS_BASE).get('/v1/collections').query(true).reply(200, fixture)

    const stdout = await runCmd(DocsCollectionListCommand, [
      '--output',
      'table',
    ])

    expect(stdout).toContain('General')
    expect(stdout).toContain('Foire aux Questions')
  })

  it('respects the --limit flag', async () => {
    nock(DOCS_BASE).get('/v1/collections').query(true).reply(200, fixture)

    const stdout = await runCmd(DocsCollectionListCommand, [
      '--output',
      'json',
      '--limit',
      '1',
    ])
    const output = JSON.parse(stdout)

    expect(output).toHaveLength(1)
    expect(output[0].name).toBe('General')
  })

  it('passes --site as the siteId query param', async () => {
    const scope = nock(DOCS_BASE)
      .get('/v1/collections')
      .query((q) => q.siteId === '52404efc4566740003092640')
      .reply(200, fixture)

    await runCmd(DocsCollectionListCommand, [
      '--site',
      '52404efc4566740003092640',
      '--output',
      'json',
    ])
    expect(scope.isDone()).toBe(true)
  })
})
