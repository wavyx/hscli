import {
  mkdir,
  writeFile,
  appendFile,
  readFile,
  readdir,
  access,
} from 'node:fs/promises'
import { dirname, join } from 'node:path'

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true })
}

/** @param {unknown} s */
export function safeName(s) {
  return String(s).replace(/[^a-z0-9_.-]/gi, '_')
}

/**
 * Persist a single item per its resource layout.
 * @param {string} baseDir
 * @param {{name:string, layout:string, dir?:string, file?:string}} resource
 * @param {{id:number|string}} item
 */
export async function writeItem(baseDir, resource, item) {
  if (resource.layout === 'per-item') {
    const file = join(baseDir, resource.dir, `${item.id}.json`)
    await ensureDir(dirname(file))
    await writeFile(file, JSON.stringify(item, null, 2))
    return file
  }
  if (resource.layout === 'mailbox') {
    const dir = join(baseDir, 'mailboxes', String(item.id))
    await ensureDir(dir)
    const file = join(dir, 'mailbox.json')
    await writeFile(file, JSON.stringify(item, null, 2))
    return file
  }
  throw new Error(`writeItem: unsupported layout: ${resource.layout}`)
}

/**
 * Write a small finite resource as one JSON array file.
 * @param {string} baseDir
 * @param {{file:string}} resource
 * @param {Array<object>} items
 */
export async function writeSingleFile(baseDir, resource, items) {
  const file = join(baseDir, resource.file)
  await ensureDir(dirname(file))
  await writeFile(file, JSON.stringify(items, null, 2))
  return file
}

function indexPath(baseDir, resource) {
  const dir =
    resource.layout === 'mailbox'
      ? join(baseDir, 'mailboxes')
      : join(baseDir, resource.dir)
  return { dir, file: join(dir, '_index.ndjson') }
}

/**
 * @param {string} baseDir
 * @param {{name:string, layout:string, dir?:string}} resource
 * @param {object} item
 */
export async function appendIndex(baseDir, resource, item) {
  if (resource.layout === 'single-file') return
  const { dir, file } = indexPath(baseDir, resource)
  await ensureDir(dir)
  await appendFile(
    file,
    JSON.stringify({
      id: item.id,
      updatedAt: item.updatedAt || item.modifiedAt || null,
    }) + '\n',
  )
}

/**
 * Read all IDs from a resource's _index.ndjson.
 * Falls back to directory listing if index missing.
 * @param {string} baseDir
 * @param {{name:string, layout:string, dir?:string}} resource
 */
export async function readLocalIds(baseDir, resource) {
  if (resource.layout === 'single-file') return new Set()
  const { dir, file } = indexPath(baseDir, resource)
  try {
    const txt = await readFile(file, 'utf8')
    return new Set(
      txt
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line).id),
    )
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }
  try {
    await access(dir)
  } catch {
    return new Set()
  }
  const entries = await readdir(dir)
  return new Set(
    entries
      .filter((n) => n.endsWith('.json') && !n.startsWith('_'))
      .map((n) => Number(n.replace(/\.json$/, '')))
      .filter((n) => !Number.isNaN(n)),
  )
}
