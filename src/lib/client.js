import createDebug from 'debug'
import { ApiError, RateLimitError, ServiceUnavailableError } from './errors.js'

const debug = createDebug('hs:client')
const BASE_URL = 'https://api.helpscout.net'

function jitter() {
  return Math.floor(Math.random() * 1000)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @param {object} options
 * @param {string} options.accessToken
 * @param {string} [options.refreshToken]
 * @param {() => Promise<string>} [options.onRefresh]
 * @param {number} [options.timeout]
 * @param {boolean} [options.retry]
 */
export function createClient({
  accessToken,
  onRefresh,
  timeout = 30_000,
  retry = true,
}) {
  let token = accessToken

  async function request(method, path, { body, query, contentType } = {}) {
    const url = new URL(path, BASE_URL)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v == null) continue
        if (Array.isArray(v)) {
          for (const item of v) url.searchParams.append(k, String(item))
        } else {
          url.searchParams.set(k, String(v))
        }
      }
    }

    const maxAttempts = retry ? 3 : 1
    let attempts = 0

    while (attempts < maxAttempts) {
      attempts++

      const headers = {
        authorization: `Bearer ${token}`,
        'content-type': contentType || 'application/json',
      }

      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeout),
      })

      debug('%s %s → %d', method, path, res.status)

      if (res.status === 429) {
        const wait = Number(res.headers.get('x-ratelimit-retry-after') || 10)
        if (!retry) throw new RateLimitError(wait)
        debug('rate limited, waiting %ds', wait)
        await sleep(wait * 1000)
        continue
      }

      if (res.status === 401 && onRefresh && attempts === 1) {
        debug('401, attempting token refresh')
        token = await onRefresh()
        continue
      }

      if (res.status >= 500 && attempts < maxAttempts) {
        const delay = Math.min(1000 * 2 ** attempts, 30_000) + jitter()
        debug('server error %d, retrying in %dms', res.status, delay)
        await sleep(delay)
        continue
      }

      if (res.status === 204) return null

      const text = await res.text()

      if (!res.ok) {
        throw ApiError.fromResponse(res.status, text, path)
      }

      return text ? JSON.parse(text) : null
    }

    throw new ServiceUnavailableError()
  }

  /**
   * @param {string} path
   * @param {object} [query]
   * @param {string} resourceKey
   * @param {{ onProgress?: (info: {page: number, totalPages: number}) => void }} [opts]
   * @returns {AsyncGenerator<object>}
   */
  async function* paginate(path, query = {}, resourceKey, opts = {}) {
    let page = 1
    let totalPages = 1

    do {
      const data = await request('GET', path, {
        query: { ...query, page },
      })
      const items = data?._embedded?.[resourceKey] ?? []
      totalPages = data?.page?.totalPages ?? 1
      if (opts.onProgress) opts.onProgress({ page, totalPages })
      yield* items
      page++
    } while (page <= totalPages)
  }

  return {
    get: (path, opts) => request('GET', path, opts),
    post: (path, opts) => request('POST', path, opts),
    put: (path, opts) => request('PUT', path, opts),
    patch: (path, opts) => request('PATCH', path, opts),
    del: (path, opts) => request('DELETE', path, opts),
    jsonPatch: (path, operations) =>
      request('PATCH', path, {
        body: operations,
        contentType: 'application/json-patch+json',
      }),
    paginate,
  }
}
