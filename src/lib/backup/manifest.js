import { readFile, writeFile, access, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export const MANIFEST_FILE = 'manifest.json'
export const MANIFEST_VERSION = '0.5.0'

/**
 * @param {{id?: number|string, name?: string}} account
 * @param {string} hscliVersion
 */
export function newManifest(account, hscliVersion) {
  return {
    version: MANIFEST_VERSION,
    hscliVersion,
    account: account || {},
    history: [],
    resources: {},
  }
}

/** @param {string} dir */
export async function readManifest(dir) {
  try {
    const txt = await readFile(join(dir, MANIFEST_FILE), 'utf8')
    return JSON.parse(txt)
  } catch (e) {
    if (e.code === 'ENOENT') return null
    throw e
  }
}

/**
 * @param {string} dir
 * @param {object} manifest
 */
export async function writeManifest(dir, manifest) {
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, MANIFEST_FILE), JSON.stringify(manifest, null, 2))
}

/** @param {string} dir */
export async function isBackupDir(dir) {
  try {
    await access(join(dir, MANIFEST_FILE))
    return true
  } catch {
    return false
  }
}
