import nock from 'nock'
import { runCmd } from '../../../helpers.js'

vi.mock('../../../../src/lib/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({ activeProfile: 'default' }),
  getProfileConfig: vi.fn().mockReturnValue(undefined),
}))
vi.mock('../../../../src/lib/docs-auth.js', () => ({
  resolveDocsKey: vi.fn().mockReturnValue({ apiKey: 'k', source: 'env' }),
}))
vi.mock('@inquirer/prompts', () => ({ confirm: vi.fn() }))

const { confirm } = await import('@inquirer/prompts')
const { default: Cmd } =
  await import('../../../../src/commands/docs/article/delete.js')
const DOCS = 'https://docsapi.helpscout.net'
const ID = '5215163545667acd25394b5c'

describe('hs docs article delete', () => {
  afterEach(() => {
    nock.cleanAll()
    vi.clearAllMocks()
  })

  it('deletes without prompting when --yes is passed', async () => {
    const scope = nock(DOCS).delete(`/v1/articles/${ID}`).reply(204)
    const out = await runCmd(Cmd, [ID, '--yes'])
    expect(out).toContain(`Deleted article ${ID}`)
    expect(confirm).not.toHaveBeenCalled()
    expect(scope.isDone()).toBe(true)
  })

  it('deletes after the user confirms', async () => {
    confirm.mockResolvedValueOnce(true)
    const scope = nock(DOCS).delete(`/v1/articles/${ID}`).reply(204)
    const out = await runCmd(Cmd, [ID])
    expect(confirm).toHaveBeenCalled()
    expect(out).toContain(`Deleted article ${ID}`)
    expect(scope.isDone()).toBe(true)
  })

  it('does nothing when the user declines', async () => {
    confirm.mockResolvedValueOnce(false)
    const out = await runCmd(Cmd, [ID])
    expect(out).toContain('Cancelled')
    // No DELETE was issued — nock has no interceptor, so a request would throw.
  })
})
