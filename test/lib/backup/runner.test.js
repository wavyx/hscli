import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import nock from 'nock'
import { createClient } from '../../../src/lib/client.js'
import { runBackup, reconcile } from '../../../src/lib/backup/runner.js'
import { writeManifest, newManifest } from '../../../src/lib/backup/manifest.js'

const API = 'https://api.helpscout.net'

function emptyPage(key) {
  return {
    _embedded: { [key]: [] },
    page: { size: 25, totalElements: 0, totalPages: 1, number: 1 },
  }
}

function page(key, items, { totalPages = 1, number = 1 } = {}) {
  return {
    _embedded: { [key]: items },
    page: {
      size: items.length,
      totalElements: items.length,
      totalPages,
      number,
    },
  }
}

function mockEmpty(resources) {
  for (const r of resources) {
    nock(API).get(r.path).query(true).reply(200, emptyPage(r.key))
  }
}

const ALL_NON_CONVS = [
  { path: '/v2/users', key: 'users' },
  { path: '/v2/teams', key: 'teams' },
  { path: '/v2/mailboxes', key: 'mailboxes' },
  { path: '/v2/tags', key: 'tags' },
  { path: '/v2/workflows', key: 'workflows' },
  { path: '/v2/webhooks', key: 'webhooks' },
  { path: '/v2/customers', key: 'customers' },
  { path: '/v2/conversations', key: 'conversations' },
]

describe('backup/runner', () => {
  let dir, client
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hsrun-'))
    client = createClient({ accessToken: 'tok', retry: false, timeout: 5000 })
    nock.cleanAll()
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
    nock.cleanAll()
  })

  it('full mode fetches every resource and writes files', async () => {
    nock(API)
      .get('/v2/users')
      .query(true)
      .reply(200, page('users', [{ id: 1, firstName: 'A' }]))
    mockEmpty(ALL_NON_CONVS.filter((r) => r.path !== '/v2/users'))

    const manifest = newManifest({}, '0.5.0')
    const { counts } = await runBackup({ client, dir, mode: 'full', manifest })
    expect(counts.users).toBe(1)
    expect(existsSync(join(dir, 'account/users/1.json'))).toBe(true)
    expect(existsSync(join(dir, 'account/users/_index.ndjson'))).toBe(true)
  })

  it('mailbox layout writes {id}/mailbox.json', async () => {
    mockEmpty(ALL_NON_CONVS.filter((r) => r.path !== '/v2/mailboxes'))
    nock(API)
      .get('/v2/mailboxes')
      .query(true)
      .reply(200, page('mailboxes', [{ id: 42, name: 'Support' }]))

    await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
    })
    expect(existsSync(join(dir, 'mailboxes/42/mailbox.json'))).toBe(true)
  })

  it('single-file layout writes {file}.json', async () => {
    mockEmpty(ALL_NON_CONVS.filter((r) => r.path !== '/v2/tags'))
    nock(API)
      .get('/v2/tags')
      .query(true)
      .reply(200, page('tags', [{ id: 1, tag: 'billing' }]))

    await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
    })
    const tags = JSON.parse(readFileSync(join(dir, 'tags.json'), 'utf8'))
    expect(tags).toHaveLength(1)
    expect(tags[0].tag).toBe('billing')
  })

  it('conversations resource uses embed and status=all', async () => {
    mockEmpty(ALL_NON_CONVS.filter((r) => r.path !== '/v2/conversations'))
    const scope = nock(API)
      .get('/v2/conversations')
      .query((q) => {
        const e = [].concat(q.embed)
        return (
          e.includes('threads') &&
          e.includes('customers') &&
          e.includes('tags') &&
          q.status === 'all'
        )
      })
      .reply(200, page('conversations', [{ id: 1 }]))

    await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
    })
    expect(scope.isDone()).toBe(true)
  })

  it('incremental mode adds modifiedSince per resource from manifest', async () => {
    mockEmpty(ALL_NON_CONVS.filter((r) => r.path !== '/v2/users'))
    const scope = nock(API)
      .get('/v2/users')
      .query((q) => q.modifiedSince === '2026-05-20T10:00:00Z')
      .reply(200, page('users', [{ id: 1 }]))

    const m = newManifest({}, '0.5.0')
    m.resources.users = { lastSyncedAt: '2026-05-20T10:00:00Z', total: 0 }
    await runBackup({ client, dir, mode: 'incremental', manifest: m })
    expect(scope.isDone()).toBe(true)
  })

  it('--since option overrides manifest lastSyncedAt', async () => {
    mockEmpty(ALL_NON_CONVS.filter((r) => r.path !== '/v2/users'))
    const scope = nock(API)
      .get('/v2/users')
      .query((q) => q.modifiedSince === '2024-01-01T00:00:00Z')
      .reply(200, page('users', []))
    await runBackup({
      client,
      dir,
      mode: 'incremental',
      manifest: newManifest({}, '0.5.0'),
      options: { since: '2024-01-01T00:00:00Z' },
    })
    expect(scope.isDone()).toBe(true)
  })

  it('include filter restricts to named resources', async () => {
    nock(API)
      .get('/v2/users')
      .query(true)
      .reply(200, page('users', [{ id: 1 }]))

    const { counts } = await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
      options: { include: ['users'] },
    })
    expect(Object.keys(counts)).toEqual(['users'])
  })

  it('exclude filter removes a resource', async () => {
    mockEmpty(ALL_NON_CONVS.filter((r) => r.path !== '/v2/users'))
    const { counts } = await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
      options: { exclude: ['users'] },
    })
    expect(counts.users).toBeUndefined()
  })

  it('dry-run does not write files', async () => {
    nock(API)
      .get('/v2/users')
      .query(true)
      .reply(200, page('users', [{ id: 1 }]))

    const { counts } = await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
      options: { include: ['users'], dryRun: true },
    })
    expect(counts.users).toBe(1)
    expect(existsSync(join(dir, 'account/users/1.json'))).toBe(false)
  })

  it('resume skips already-completed resources', async () => {
    nock(API)
      .get('/v2/teams')
      .query(true)
      .reply(200, page('teams', [{ id: 1 }]))

    const { counts } = await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
      options: {
        include: ['users', 'teams'],
        completed: ['users'],
      },
    })
    expect(counts.users).toBeUndefined()
    expect(counts.teams).toBe(1)
  })

  it('onItem hook fires per item', async () => {
    nock(API)
      .get('/v2/users')
      .query(true)
      .reply(200, page('users', [{ id: 1 }, { id: 2 }]))

    const seen = []
    await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
      options: { include: ['users'] },
      hooks: { onItem: async (r, item) => seen.push([r.name, item.id]) },
    })
    expect(seen).toEqual([
      ['users', 1],
      ['users', 2],
    ])
  })

  it('onProgress hook fires per page', async () => {
    nock(API)
      .get('/v2/users')
      .query((q) => q.page === '1')
      .reply(200, page('users', [{ id: 1 }], { totalPages: 2, number: 1 }))
      .get('/v2/users')
      .query((q) => q.page === '2')
      .reply(200, page('users', [{ id: 2 }], { totalPages: 2, number: 2 }))

    const pages = []
    await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
      options: { include: ['users'] },
      hooks: { onProgress: (r, info) => pages.push([r.name, info.page]) },
    })
    expect(pages).toEqual([
      ['users', 1],
      ['users', 2],
    ])
  })

  it('resume with inProgress skips already-fetched pages of in-progress resource', async () => {
    nock(API)
      .get('/v2/users')
      .query((q) => q.page === '1')
      .reply(200, page('users', [{ id: 1 }], { totalPages: 2, number: 1 }))
      .get('/v2/users')
      .query((q) => q.page === '2')
      .reply(200, page('users', [{ id: 2 }], { totalPages: 2, number: 2 }))

    const { counts } = await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
      options: {
        include: ['users'],
        inProgress: { resource: 'users', lastCompletedPage: 1 },
      },
    })
    // only page 2's items processed
    expect(counts.users).toBe(1)
    expect(existsSync(join(dir, 'account/users/2.json'))).toBe(true)
    expect(existsSync(join(dir, 'account/users/1.json'))).toBe(false)
  })

  it('runs reconcile and writes _deleted.ndjson tombstones', async () => {
    // pre-seed local: ids 10, 11
    await writeManifest(dir, newManifest({}, '0.5.0'))
    mockEmpty(ALL_NON_CONVS.filter((r) => r.path !== '/v2/customers'))
    nock(API)
      .get('/v2/customers')
      .query(true)
      .reply(200, page('customers', [{ id: 10 }, { id: 11 }]))
    await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
      options: { include: ['customers'] },
    })

    // remote now only has 10 — 11 should be tombstoned
    nock(API)
      .get('/v2/customers')
      .query(true)
      .reply(200, page('customers', [{ id: 10 }]))
    const tombs = await reconcile({
      client,
      dir,
      options: { include: ['customers'] },
    })
    expect(tombs).toHaveLength(1)
    expect(tombs[0].id).toBe(11)

    const txt = readFileSync(join(dir, '_deleted.ndjson'), 'utf8')
    const line = JSON.parse(txt.trim())
    expect(line.id).toBe(11)
    expect(line.resource).toBe('customers')
  })

  it('reconcile skips single-file resources and resources with empty local set', async () => {
    mockEmpty(ALL_NON_CONVS.filter((r) => r.path !== '/v2/users'))
    nock(API)
      .get('/v2/users')
      .query(true)
      .reply(200, page('users', [{ id: 1 }]))
    // no local users data — reconcile should not call /v2/users
    const tombs = await reconcile({
      client,
      dir,
      options: { include: ['users'] },
    })
    expect(tombs).toHaveLength(0)
  })

  it('reconcile onTombstone hook fires', async () => {
    await writeManifest(dir, newManifest({}, '0.5.0'))
    nock(API)
      .get('/v2/customers')
      .query(true)
      .reply(200, page('customers', [{ id: 10 }]))
    await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
      options: { include: ['customers'] },
    })
    nock(API).get('/v2/customers').query(true).reply(200, page('customers', []))
    const calls = []
    await reconcile({
      client,
      dir,
      options: { include: ['customers'] },
      hooks: { onTombstone: async (r, id) => calls.push([r.name, id]) },
    })
    expect(calls).toEqual([['customers', 10]])
  })

  it('single-file resource fires onItem and onProgress hooks', async () => {
    nock(API)
      .get('/v2/tags')
      .query(true)
      .reply(
        200,
        page('tags', [
          { id: 1, tag: 'a' },
          { id: 2, tag: 'b' },
        ]),
      )

    const items = []
    const pages = []
    await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
      options: { include: ['tags'] },
      hooks: {
        onItem: async (r, item) => items.push([r.name, item.id]),
        onProgress: (r, info) => pages.push([r.name, info.page]),
      },
    })
    expect(items).toEqual([
      ['tags', 1],
      ['tags', 2],
    ])
    expect(pages).toEqual([['tags', 1]])
  })

  it('inProgress with lastCompletedPage missing defaults to 0', async () => {
    nock(API)
      .get('/v2/users')
      .query(true)
      .reply(200, page('users', [{ id: 1 }]))

    const { counts } = await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
      options: {
        include: ['users'],
        inProgress: { resource: 'users' },
      },
    })
    expect(counts.users).toBe(1)
  })

  it('reconcile on conversations uses status=all', async () => {
    await writeManifest(dir, newManifest({}, '0.5.0'))
    // seed local
    nock(API)
      .get('/v2/conversations')
      .query(true)
      .reply(200, page('conversations', [{ id: 1 }]))
    await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
      options: { include: ['conversations'] },
    })

    const scope = nock(API)
      .get('/v2/conversations')
      .query((q) => q.status === 'all')
      .reply(200, page('conversations', [{ id: 1 }]))
    await reconcile({ client, dir, options: { include: ['conversations'] } })
    expect(scope.isDone()).toBe(true)
  })

  it('reconcile dry-run does not write _deleted.ndjson', async () => {
    await writeManifest(dir, newManifest({}, '0.5.0'))
    nock(API)
      .get('/v2/customers')
      .query(true)
      .reply(200, page('customers', [{ id: 10 }]))
    await runBackup({
      client,
      dir,
      mode: 'full',
      manifest: newManifest({}, '0.5.0'),
      options: { include: ['customers'] },
    })
    nock(API).get('/v2/customers').query(true).reply(200, page('customers', []))
    const tombs = await reconcile({
      client,
      dir,
      options: { include: ['customers'], dryRun: true },
    })
    expect(tombs).toHaveLength(1)
    expect(existsSync(join(dir, '_deleted.ndjson'))).toBe(false)
  })
})
