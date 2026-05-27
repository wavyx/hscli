import Conf from 'conf'
import createDebug from 'debug'

const debug = createDebug('hs:keychain')
const SERVICE = 'hscli'

/** @type {typeof import('@napi-rs/keyring').Entry | null} */
let Entry = null
/** @type {Conf | null} */
let fallbackStore = null

try {
  const mod = await import('@napi-rs/keyring')
  Entry = mod.Entry
  debug('using OS keychain via @napi-rs/keyring')
} catch {
  debug('keyring unavailable, falling back to encrypted file store')
}

function getEntry(account) {
  return new Entry(SERVICE, account)
}

function getFallbackStore() {
  fallbackStore ??= new Conf({
    projectName: 'hscli',
    configName: 'credentials',
    encryptionKey: `${SERVICE}-fallback`,
  })
  return fallbackStore
}

/**
 * @typedef {object} StoredTokens
 * @property {string} accessToken
 * @property {string} [refreshToken]
 * @property {number} expiresAt
 * @property {'authorization_code' | 'client_credentials'} authMode
 * @property {'embedded' | 'byo'} credentialSource
 */

/**
 * @param {string} profile
 * @returns {Promise<StoredTokens | null>}
 */
export async function getTokens(profile) {
  const account = `${profile}/tokens`
  try {
    if (Entry) {
      const raw = getEntry(account).getPassword()
      return raw ? JSON.parse(raw) : null
    }
    return getFallbackStore().get(account) ?? null
  } catch (err) {
    debug('getTokens error: %s', err.message)
    return null
  }
}

/**
 * @param {string} profile
 * @param {StoredTokens} tokens
 */
export async function setTokens(profile, tokens) {
  const account = `${profile}/tokens`
  if (Entry) {
    getEntry(account).setPassword(JSON.stringify(tokens))
  } else {
    getFallbackStore().set(account, tokens)
  }
}

/** @param {string} profile */
export async function deleteTokens(profile) {
  const account = `${profile}/tokens`
  if (Entry) {
    getEntry(account).deletePassword()
  } else {
    getFallbackStore().delete(account)
  }
}

export function isKeychainAvailable() {
  return Entry !== null
}
