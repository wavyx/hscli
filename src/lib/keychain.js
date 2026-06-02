import createDebug from 'debug'
import { CliError } from './errors.js'

const debug = createDebug('hs:keychain')
const SERVICE = 'hscli'

/** @type {typeof import('@napi-rs/keyring').Entry | null} */
let Entry = null

try {
  const mod = await import('@napi-rs/keyring')
  Entry = mod.Entry
  debug('using OS keychain via @napi-rs/keyring')
} catch {
  debug('OS keychain unavailable')
}

function getEntry(account) {
  return new Entry(SERVICE, account)
}

function keychainRequired() {
  throw new CliError(
    'OS keychain unavailable. hscli stores credentials in your operating system ' +
      'keychain (macOS Keychain, Windows Credential Manager, or libsecret on Linux) ' +
      'and refuses to write them to disk in plaintext. Enable a system keychain and retry.',
    { exitCode: 78 },
  )
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
  if (!Entry) return null
  const account = `${profile}/tokens`
  try {
    const raw = getEntry(account).getPassword()
    return raw ? JSON.parse(raw) : null
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
  if (!Entry) keychainRequired()
  const account = `${profile}/tokens`
  getEntry(account).setPassword(JSON.stringify(tokens))
}

/** @param {string} profile */
export async function deleteTokens(profile) {
  if (!Entry) return
  const account = `${profile}/tokens`
  getEntry(account).deletePassword()
}

export function isKeychainAvailable() {
  return Entry !== null
}
