import { getDocsKey } from './keychain.js'
import { ConfigError } from './errors.js'

/**
 * @typedef {object} ResolvedDocsKey
 * @property {string} apiKey
 * @property {'flags' | 'env' | 'keychain'} source
 */

/**
 * Resolve the Help Scout Docs API key.
 * Precedence (highest first): flag → env (HSCLI_DOCS_API_KEY) → keychain.
 * The Docs API is a separate product with its own per-user key (used as the
 * HTTP Basic-auth username), independent of the Mailbox OAuth credentials.
 *
 * @param {object} [options]
 * @param {object} [options.flags]
 * @param {string} [options.flags.apiKey]
 * @param {string} [options.profile]
 * @returns {Promise<ResolvedDocsKey>}
 */
export async function resolveDocsKey({ flags, profile } = {}) {
  if (flags?.apiKey) return { apiKey: flags.apiKey, source: 'flags' }

  if (process.env.HSCLI_DOCS_API_KEY) {
    return { apiKey: process.env.HSCLI_DOCS_API_KEY, source: 'env' }
  }

  if (profile) {
    const key = await getDocsKey(profile)
    if (key) return { apiKey: key, source: 'keychain' }
  }

  throw new ConfigError(
    'No Docs API key found. Set HSCLI_DOCS_API_KEY or run: hscli docs auth',
  )
}
