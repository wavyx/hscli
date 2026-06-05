import { describe, it, expect, afterEach } from 'vitest'
import nock from 'nock'
import { createDocsClient } from '../../src/lib/docs-client.js'

const BASE = 'https://docsapi.helpscout.net'
const client = (opts) => createDocsClient({ apiKey: 'k', ...opts })

describe('docs-client', () => {
  afterEach(() => nock.cleanAll())

  it('sends Basic auth (key:X) and returns parsed JSON', async () => {
    const scope = nock(BASE, {
      reqheaders: {
        authorization: `Basic ${Buffer.from('k:X').toString('base64')}`,
      },
    })
      .get('/v1/collections')
      .reply(200, { collections: { items: [] } })
    const r = await client().get('collections')
    expect(r).toEqual({ collections: { items: [] } })
    expect(scope.isDone()).toBe(true)
  })

  it('refuses non-Docs hosts (host-lock)', async () => {
    await expect(client().get('https://evil.example.com/x')).rejects.toThrow(
      /non-Help Scout Docs host/,
    )
  })

  it('throws ApiError on a non-2xx response', async () => {
    nock(BASE).get('/v1/articles/x').reply(404, { error: 'Not found' })
    await expect(client().get('articles/x')).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('throws ApiError on 5xx when retry is disabled', async () => {
    nock(BASE).get('/v1/collections').reply(500, { error: 'boom' })
    await expect(
      client({ retry: false }).get('collections'),
    ).rejects.toMatchObject({ statusCode: 500 })
  })

  it('returns null on 204 No Content', async () => {
    nock(BASE).delete('/v1/articles/x').reply(204)
    expect(await client().del('articles/x')).toBeNull()
  })

  it('throws RateLimitError on 429 when retry is disabled', async () => {
    nock(BASE)
      .get('/v1/collections')
      .reply(429, '', { 'x-ratelimit-reset': '7' })
    await expect(
      client({ retry: false }).get('collections'),
    ).rejects.toMatchObject({ retryAfter: 7 })
  })

  it('retries after a 429 then succeeds', async () => {
    nock(BASE)
      .get('/v1/collections')
      .reply(429, '', { 'x-ratelimit-reset': '0' })
    nock(BASE).get('/v1/collections').reply(200, { ok: true })
    expect(await client().get('collections')).toEqual({ ok: true })
  })

  it('gives up with ServiceUnavailableError after repeated 429s', async () => {
    for (let i = 0; i < 3; i++) {
      nock(BASE)
        .get('/v1/collections')
        .reply(429, '', { 'x-ratelimit-reset': '0' })
    }
    await expect(client().get('collections')).rejects.toThrow(/unavailable/i)
  })

  it('paginates across the Docs envelope', async () => {
    nock(BASE)
      .get('/v1/collections')
      .query({ page: 1 })
      .reply(200, { collections: { page: 1, pages: 2, items: [{ id: 'a' }] } })
    nock(BASE)
      .get('/v1/collections')
      .query({ page: 2 })
      .reply(200, { collections: { page: 2, pages: 2, items: [{ id: 'b' }] } })

    const out = []
    for await (const c of client().paginate('collections', {}, 'collections')) {
      out.push(c.id)
    }
    expect(out).toEqual(['a', 'b'])
  })

  it('terminates when pages is non-numeric (no infinite loop)', async () => {
    nock(BASE)
      .get('/v1/collections')
      .query({ page: 1 })
      .reply(200, {
        collections: { page: 1, pages: 'unknown', items: [{ id: 'a' }] },
      })
    const out = []
    for await (const c of client().paginate('collections', {}, 'collections')) {
      out.push(c.id)
    }
    expect(out).toEqual(['a'])
  })

  it('reports pagination progress via onProgress', async () => {
    nock(BASE)
      .get('/v1/collections')
      .query({ page: 1 })
      .reply(200, { collections: { page: 1, pages: 1, items: [{ id: 'a' }] } })

    const seen = []
    const gen = client().paginate('collections', {}, 'collections', {
      onProgress: (info) => seen.push(info),
    })
    for await (const _ of gen) void _
    expect(seen).toEqual([{ page: 1, totalPages: 1 }])
  })

  it('retries after a 5xx then succeeds', async () => {
    nock(BASE).get('/v1/collections').reply(503, { error: 'temporary' })
    nock(BASE).get('/v1/collections').reply(200, { ok: true })
    expect(await client().get('collections')).toEqual({ ok: true })
  }, 15000)

  it('issues POST and PUT write requests', async () => {
    nock(BASE).post('/v1/articles', { name: 'A' }).reply(201, { id: '1' })
    nock(BASE).put('/v1/articles/1', { name: 'B' }).reply(200, { id: '1' })
    expect(await client().post('articles', { body: { name: 'A' } })).toEqual({
      id: '1',
    })
    expect(await client().put('articles/1', { body: { name: 'B' } })).toEqual({
      id: '1',
    })
  })

  it('handles an empty pagination envelope', async () => {
    nock(BASE).get('/v1/collections').query(true).reply(200, {})
    const out = []
    for await (const c of client().paginate('collections', {}, 'collections')) {
      out.push(c)
    }
    expect(out).toEqual([])
  })

  it('skips null/undefined query params', async () => {
    nock(BASE).get('/v1/x').query({ b: '1' }).reply(200, { ok: true })
    expect(
      await client().get('x', { query: { a: null, b: 1, c: undefined } }),
    ).toEqual({ ok: true })
  })

  it('uses retry-after / default when 429 lacks x-ratelimit-reset', async () => {
    nock(BASE).get('/v1/a').reply(429, '', { 'retry-after': '3' })
    await expect(client({ retry: false }).get('a')).rejects.toMatchObject({
      retryAfter: 3,
    })
    nock(BASE).get('/v1/b').reply(429, '')
    await expect(client({ retry: false }).get('b')).rejects.toMatchObject({
      retryAfter: 10,
    })
  })

  it('uses a 10s wait when the rate-limit header is non-numeric', async () => {
    nock(BASE).get('/v1/c').reply(429, '', { 'retry-after': 'later' })
    await expect(client({ retry: false }).get('c')).rejects.toMatchObject({
      retryAfter: 10,
    })
  })

  it('returns null for an empty (non-204) body', async () => {
    nock(BASE).get('/v1/empty').reply(200, '')
    expect(await client().get('empty')).toBeNull()
  })
})
