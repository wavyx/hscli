import createDebug from 'debug'
import {
  ApiError,
  CliError,
  RateLimitError,
  ServiceUnavailableError,
} from './errors.js'

const debug = createDebug('hs:docs-client')
const BASE_URL = 'https://docsapi.helpscout.net/v1/'
const BASE_ORIGIN = new URL(BASE_URL).origin

function jitter() {
  return Math.floor(Math.random() * 1000)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Help Scout Docs API client. Authenticates with the per-user Docs API key via
 * HTTP Basic auth (key as username, dummy "X" password) and is host-locked to
 * docsapi.helpscout.net.
 *
 * @param {object} options
 * @param {string} options.apiKey
 * @param {number} [options.timeout]
 * @param {boolean} [options.retry]
 * @param {string} [options.userAgent]
 */
export function createDocsClient({
  apiKey,
  timeout = 30_000,
  retry = true,
  userAgent = 'hscli',
}) {
  const authorization = `Basic ${Buffer.from(`${apiKey}:X`).toString('base64')}`

  async function request(method, path, { body, query } = {}) {
    const url = new URL(String(path).replace(/^\//, ''), BASE_URL)
    if (url.origin !== BASE_ORIGIN) {
      throw new CliError(
        `Refusing to send request to non-Help Scout Docs host: ${url.origin}`,
        { exitCode: 78 },
      )
    }
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v == null) continue
        url.searchParams.set(k, String(v))
      }
    }

    const maxAttempts = retry ? 3 : 1
    let attempts = 0

    while (attempts < maxAttempts) {
      attempts++

      const res = await fetch(url, {
        method,
        headers: {
          authorization,
          accept: 'application/json',
          'content-type': 'application/json',
          'user-agent': userAgent,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeout),
      })

      debug('%s %s → %d', method, path, res.status)

      if (res.status === 429) {
        const wait = Number(
          res.headers.get('x-ratelimit-reset') ||
            res.headers.get('retry-after') ||
            10,
        )
        if (!retry) throw new RateLimitError(wait)
        debug('rate limited, waiting %ds', wait)
        await sleep(wait * 1000)
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
      if (!res.ok) throw ApiError.fromResponse(res.status, text, path)
      return text ? JSON.parse(text) : null
    }

    throw new ServiceUnavailableError()
  }

  /**
   * Page through a Docs list endpoint. The Docs envelope is
   * `{ <resourceKey>: { page, pages, count, items: [...] } }`.
   * @param {string} path
   * @param {object} [query]
   * @param {string} resourceKey
   * @param {{ onProgress?: (info: {page: number, totalPages: number}) => void }} [opts]
   * @returns {AsyncGenerator<object>}
   */
  async function* paginate(path, query = {}, resourceKey, opts = {}) {
    let page = 1
    while (true) {
      const data = await request('GET', path, { query: { ...query, page } })
      const wrap = data?.[resourceKey] ?? {}
      const items = wrap.items ?? []
      const totalPages = wrap.pages ?? 1
      if (opts.onProgress) opts.onProgress({ page, totalPages })
      yield* items
      if (page >= totalPages) break
      page++
    }
  }

  return {
    get: (path, opts) => request('GET', path, opts),
    post: (path, opts) => request('POST', path, opts),
    put: (path, opts) => request('PUT', path, opts),
    del: (path, opts) => request('DELETE', path, opts),
    paginate,
  }
}
