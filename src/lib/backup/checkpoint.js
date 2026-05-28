import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export const CHECKPOINT_FILE = 'checkpoint.json'

/** @param {string} dir */
export async function readCheckpoint(dir) {
  try {
    const txt = await readFile(join(dir, CHECKPOINT_FILE), 'utf8')
    return JSON.parse(txt)
  } catch (e) {
    if (e.code === 'ENOENT') return null
    throw e
  }
}

/**
 * @param {string} dir
 * @param {object} state
 */
export async function writeCheckpoint(dir, state) {
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, CHECKPOINT_FILE), JSON.stringify(state, null, 2))
}

/** @param {string} dir */
export async function deleteCheckpoint(dir) {
  try {
    await unlink(join(dir, CHECKPOINT_FILE))
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }
}
