import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import nock from 'nock'
import { createClient } from '../../src/lib/client.js'
import { ApiError, RateLimitError } from '../../src/lib/errors.js'
const API_BASE = 'https://api.helpscout.net'

describe('createClient', () => {
  let client

  beforeEach(() => {
    nock.cleanAll()
    client = createClient({
      accessToken: 'test-token',
      retry: false,
      timeout: 5000,
    })
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('GET requests', () => {
    it('returns parsed JSON on success', async () => {
      const scope = nock(API_BASE)
        .get('/v2/mailboxes')
        .reply(200, { id: 1, name: 'Support' })

      const result = await client.get('/v2/mailboxes')
      expect(result).toEqual({ id: 1, name: 'Support' })
      expect(scope.isDone()).toBe(true)
    })

    it('sends Authorization Bearer header', async () => {
      const scope = nock(API_BASE)
        .get('/v2/mailboxes')
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, { ok: true })

      await client.get('/v2/mailboxes')
      expect(scope.isDone()).toBe(true)
    })

    it('returns null for 204 responses', async () => {
      const scope = nock(API_BASE).get('/v2/mailboxes/1').reply(204)

      const result = await client.get('/v2/mailboxes/1')
      expect(result).toBeNull()
      expect(scope.isDone()).toBe(true)
    })

    it('passes query parameters', async () => {
      const scope = nock(API_BASE)
        .get('/v2/conversations')
        .query({ status: 'active', page: '1' })
        .reply(200, { items: [] })

      const result = await client.get('/v2/conversations', {
        query: { status: 'active', page: 1 },
      })
      expect(result).toEqual({ items: [] })
      expect(scope.isDone()).toBe(true)
    })
  })

  describe('error handling', () => {
    it('throws ApiError for non-ok responses', async () => {
      nock(API_BASE).get('/v2/missing').reply(404, { message: 'Not Found' })

      await expect(client.get('/v2/missing')).rejects.toThrow(ApiError)
    })

    it('throws ApiError with correct status code', async () => {
      nock(API_BASE).get('/v2/bad').reply(422, { message: 'Validation failed' })

      try {
        await client.get('/v2/bad')
        expect.unreachable('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        expect(err.statusCode).toBe(422)
        expect(err.message).toContain('Validation failed')
      }
    })

    it('throws RateLimitError on 429 when retry is false', async () => {
      nock(API_BASE)
        .get('/v2/limited')
        .reply(429, '', { 'x-ratelimit-retry-after': '15' })

      try {
        await client.get('/v2/limited')
        expect.unreachable('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitError)
        expect(err.retryAfter).toBe(15)
        expect(err.exitCode).toBe(75)
      }
    })
  })

  describe('retry behavior', () => {
    it('retries on 429 when retry is enabled', async () => {
      const retryClient = createClient({
        accessToken: 'test-token',
        retry: true,
        timeout: 5000,
      })

      const scope = nock(API_BASE)
        .get('/v2/data')
        .reply(429, '', { 'x-ratelimit-retry-after': '0' })
        .get('/v2/data')
        .reply(200, { success: true })

      const result = await retryClient.get('/v2/data')
      expect(result).toEqual({ success: true })
      expect(scope.isDone()).toBe(true)
    })

    it('retries on 401 when onRefresh is provided', async () => {
      const newToken = 'refreshed-token'
      const onRefresh = vi.fn().mockResolvedValue(newToken)
      const refreshClient = createClient({
        accessToken: 'expired-token',
        onRefresh,
        retry: true,
        timeout: 5000,
      })

      const scope = nock(API_BASE)
        .get('/v2/me')
        .matchHeader('authorization', 'Bearer expired-token')
        .reply(401, { message: 'Unauthorized' })
        .get('/v2/me')
        .matchHeader('authorization', `Bearer ${newToken}`)
        .reply(200, { id: 1, name: 'User' })

      const result = await refreshClient.get('/v2/me')
      expect(result).toEqual({ id: 1, name: 'User' })
      expect(onRefresh).toHaveBeenCalledOnce()
      expect(scope.isDone()).toBe(true)
    })

    it('retries on 5xx with backoff', async () => {
      const retryClient = createClient({
        accessToken: 'test-token',
        retry: true,
        timeout: 5000,
      })

      const scope = nock(API_BASE)
        .get('/v2/flaky')
        .reply(500, { message: 'Internal Server Error' })
        .get('/v2/flaky')
        .reply(200, { recovered: true })

      const result = await retryClient.get('/v2/flaky')
      expect(result).toEqual({ recovered: true })
      expect(scope.isDone()).toBe(true)
    })

    it('throws ApiError on final 5xx attempt after exhausting retries', async () => {
      const retryClient = createClient({
        accessToken: 'test-token',
        retry: true,
        timeout: 5000,
      })

      // 3 attempts total: first 2 trigger backoff retry, last falls through to ApiError
      const scope = nock(API_BASE)
        .get('/v2/down')
        .times(3)
        .reply(503, { message: 'Service Unavailable' })

      try {
        await retryClient.get('/v2/down')
        expect.unreachable('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        expect(err.statusCode).toBe(503)
        expect(err.exitCode).toBe(69)
      }
      expect(scope.isDone()).toBe(true)
    }, 30_000)

    it('throws ServiceUnavailableError when rate-limit retries exhaust the loop', async () => {
      const retryClient = createClient({
        accessToken: 'test-token',
        retry: true,
        timeout: 5000,
      })

      // 429 with retry-after 0 will consume all 3 attempts via continue,
      // then the while condition fails and we hit ServiceUnavailableError
      const scope = nock(API_BASE)
        .get('/v2/throttled')
        .times(3)
        .reply(429, '', { 'x-ratelimit-retry-after': '0' })

      try {
        await retryClient.get('/v2/throttled')
        expect.unreachable('should have thrown')
      } catch (err) {
        expect(err.message).toBe('Help Scout API is unavailable')
        expect(err.exitCode).toBe(69)
      }
      expect(scope.isDone()).toBe(true)
    })
  })

  describe('paginate', () => {
    it('yields items across multiple pages', async () => {
      const scope = nock(API_BASE)
        .get('/v2/conversations')
        .query({ page: '1' })
        .reply(200, {
          _embedded: {
            conversations: [
              { id: 1, subject: 'First' },
              { id: 2, subject: 'Second' },
            ],
          },
          page: { totalPages: 2 },
        })
        .get('/v2/conversations')
        .query({ page: '2' })
        .reply(200, {
          _embedded: {
            conversations: [{ id: 3, subject: 'Third' }],
          },
          page: { totalPages: 2 },
        })

      const items = []
      for await (const item of client.paginate(
        '/v2/conversations',
        {},
        'conversations',
      )) {
        items.push(item)
      }

      expect(items).toHaveLength(3)
      expect(items[0]).toEqual({ id: 1, subject: 'First' })
      expect(items[1]).toEqual({ id: 2, subject: 'Second' })
      expect(items[2]).toEqual({ id: 3, subject: 'Third' })
      expect(scope.isDone()).toBe(true)
    })

    it('handles a single page of results', async () => {
      const scope = nock(API_BASE)
        .get('/v2/mailboxes')
        .query({ page: '1' })
        .reply(200, {
          _embedded: {
            mailboxes: [{ id: 10, name: 'Inbox' }],
          },
          page: { totalPages: 1 },
        })

      const items = []
      for await (const item of client.paginate(
        '/v2/mailboxes',
        {},
        'mailboxes',
      )) {
        items.push(item)
      }

      expect(items).toHaveLength(1)
      expect(items[0]).toEqual({ id: 10, name: 'Inbox' })
      expect(scope.isDone()).toBe(true)
    })

    it('passes additional query parameters alongside page', async () => {
      const scope = nock(API_BASE)
        .get('/v2/conversations')
        .query({ status: 'active', page: '1' })
        .reply(200, {
          _embedded: { conversations: [{ id: 1 }] },
          page: { totalPages: 1 },
        })

      const items = []
      for await (const item of client.paginate(
        '/v2/conversations',
        { status: 'active' },
        'conversations',
      )) {
        items.push(item)
      }

      expect(items).toHaveLength(1)
      expect(scope.isDone()).toBe(true)
    })

    it('yields nothing when resource key is missing from response', async () => {
      const scope = nock(API_BASE)
        .get('/v2/empty')
        .query({ page: '1' })
        .reply(200, { page: { totalPages: 1 } })

      const items = []
      for await (const item of client.paginate('/v2/empty', {}, 'things')) {
        items.push(item)
      }

      expect(items).toHaveLength(0)
      expect(scope.isDone()).toBe(true)
    })

    it('handles missing page metadata in response', async () => {
      const scope = nock(API_BASE)
        .get('/v2/things')
        .query({ page: '1' })
        .reply(200, { _embedded: { things: [{ id: 1 }] } })

      const items = []
      for await (const item of client.paginate('/v2/things', {}, 'things')) {
        items.push(item)
      }

      expect(items).toHaveLength(1)
      expect(scope.isDone()).toBe(true)
    })
  })

  describe('POST requests', () => {
    it('sends JSON body', async () => {
      const scope = nock(API_BASE)
        .post('/v2/conversations', { subject: 'Test' })
        .reply(201, { id: 1 })

      const result = await client.post('/v2/conversations', {
        body: { subject: 'Test' },
      })
      expect(result).toEqual({ id: 1 })
      expect(scope.isDone()).toBe(true)
    })
  })

  describe('PUT requests', () => {
    it('sends PUT with body', async () => {
      const scope = nock(API_BASE)
        .put('/v2/conversations/1', { status: 'closed' })
        .reply(200, { id: 1, status: 'closed' })

      const result = await client.put('/v2/conversations/1', {
        body: { status: 'closed' },
      })
      expect(result.status).toBe('closed')
      expect(scope.isDone()).toBe(true)
    })
  })

  describe('PATCH requests', () => {
    it('sends PATCH with body', async () => {
      const scope = nock(API_BASE)
        .patch('/v2/conversations/1', { subject: 'Updated' })
        .reply(200, { id: 1, subject: 'Updated' })

      const result = await client.patch('/v2/conversations/1', {
        body: { subject: 'Updated' },
      })
      expect(result.subject).toBe('Updated')
      expect(scope.isDone()).toBe(true)
    })
  })

  describe('DELETE requests', () => {
    it('sends DELETE', async () => {
      const scope = nock(API_BASE).delete('/v2/conversations/1').reply(204)

      const result = await client.del('/v2/conversations/1')
      expect(result).toBeNull()
      expect(scope.isDone()).toBe(true)
    })
  })

  describe('jsonPatch requests', () => {
    it('sends PATCH with JSON Patch content type', async () => {
      const scope = nock(API_BASE)
        .patch('/v2/conversations/1', [
          { op: 'replace', path: '/status', value: 'closed' },
        ])
        .matchHeader('content-type', 'application/json-patch+json')
        .reply(204)

      const result = await client.jsonPatch('/v2/conversations/1', [
        { op: 'replace', path: '/status', value: 'closed' },
      ])
      expect(result).toBeNull()
      expect(scope.isDone()).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('returns null for empty response body', async () => {
      nock(API_BASE).get('/v2/empty').reply(200, '')

      const result = await client.get('/v2/empty')
      expect(result).toBeNull()
    })

    it('uses default retry-after of 10 when header missing on 429', async () => {
      const retryClient = createClient({
        accessToken: 'test-token',
        retry: false,
        timeout: 5000,
      })

      nock(API_BASE).get('/v2/test').reply(429)

      try {
        await retryClient.get('/v2/test')
      } catch (err) {
        expect(err.retryAfter).toBe(10)
      }
    })
  })
})
