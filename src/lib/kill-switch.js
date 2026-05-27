import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import createDebug from 'debug'
import { getConf } from './config.js'

const debug = createDebug('hs:kill-switch')
const MANIFEST_URL =
  'https://raw.githubusercontent.com/wavyx/hscli/main/manifest.json'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 3000

/**
 * @param {object} options
 * @param {string} options.clientId
 * @param {string} options.cliVersion
 * @returns {Promise<{ok: boolean, reason?: string, action?: string}>}
 */
export async function checkKillSwitch({ clientId, cliVersion }) {
  try {
    const manifest = await getManifest()
    if (!manifest) return { ok: true }

    if (manifest.revoked_apps?.includes(clientId)) {
      return {
        ok: false,
        reason: 'The default OAuth app has been revoked.',
        action:
          'Run `hs auth setup` to configure your own OAuth app, or upgrade hscli.',
      }
    }

    if (manifest.compromised_versions?.includes(cliVersion)) {
      return {
        ok: false,
        reason: `CLI version ${cliVersion} has been marked as compromised.`,
        action: 'Upgrade hscli immediately: npm i -g hscli@latest',
      }
    }

    return { ok: true }
  } catch (err) {
    debug('kill-switch check failed: %s', err.message)
    return { ok: true }
  }
}

async function getManifest() {
  const cacheDir = join(getConf().path, '..')
  const cachePath = join(cacheDir, 'manifest-cache.json')

  try {
    const cached = JSON.parse(readFileSync(cachePath, 'utf8'))
    if (Date.now() - cached._fetchedAt < CACHE_TTL_MS) {
      debug('using cached manifest')
      return cached
    }
  } catch {
    // no cache or invalid — fetch fresh
  }

  debug('fetching manifest from %s', MANIFEST_URL)
  const res = await fetch(MANIFEST_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!res.ok) {
    debug('manifest fetch failed: %d', res.status)
    return null
  }

  const manifest = await res.json()
  manifest._fetchedAt = Date.now()

  try {
    mkdirSync(cacheDir, { recursive: true })
    writeFileSync(cachePath, JSON.stringify(manifest))
  } catch (err) {
    debug('failed to cache manifest: %s', err.message)
  }

  return manifest
}
