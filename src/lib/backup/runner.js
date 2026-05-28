import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { filterResources } from './resources.js'
import {
  writeItem,
  writeSingleFile,
  appendIndex,
  readLocalIds,
} from './writer.js'
import { writeCheckpoint, deleteCheckpoint } from './checkpoint.js'

/**
 * Execute a backup pass over selected resources.
 *
 * @param {object} args
 * @param {object} args.client                    api client (with .get and .paginate)
 * @param {string} args.dir                       output directory
 * @param {'full'|'incremental'} args.mode
 * @param {object} args.manifest                  existing manifest (with .resources)
 * @param {object} [args.options]
 * @param {string[]} [args.options.include]
 * @param {string[]} [args.options.exclude]
 * @param {string} [args.options.since]           ISO override for modifiedSince
 * @param {boolean} [args.options.dryRun]
 * @param {string[]} [args.options.completed]     resumed: skip these resources
 * @param {object} [args.options.inProgress]      resumed: {resource, lastCompletedPage}
 * @param {object} [args.hooks]
 * @param {(r:object, item:object) => Promise<void>} [args.hooks.onItem]
 * @param {(r:object, info:{page:number,totalPages:number}) => void} [args.hooks.onProgress]
 */
export async function runBackup({
  client,
  dir,
  mode,
  manifest,
  options = {},
  hooks = {},
}) {
  const resources = filterResources(options)
  const counts = {}
  const completed = [...(options.completed || [])]
  const inProgress = options.inProgress || null

  for (const resource of resources) {
    if (completed.includes(resource.name)) continue

    const since =
      options.since ||
      (mode === 'incremental'
        ? manifest?.resources?.[resource.name]?.lastSyncedAt
        : null)

    const query = {}
    if (since) query.modifiedSince = since
    if (resource.embeds) query.embed = resource.embeds
    if (resource.statusAll) query.status = 'all'

    let count = 0

    if (resource.layout === 'single-file') {
      const items = []
      for await (const item of client.paginate(
        resource.path,
        query,
        resource.key,
        { onProgress: (info) => hooks.onProgress?.(resource, info) },
      )) {
        items.push(item)
        if (hooks.onItem) await hooks.onItem(resource, item)
      }
      if (!options.dryRun) await writeSingleFile(dir, resource, items)
      count = items.length
    } else {
      const skipPages =
        inProgress?.resource === resource.name
          ? inProgress.lastCompletedPage || 0
          : 0
      let currentPage = 0
      for await (const item of paginateWithSkip(
        client,
        resource,
        query,
        skipPages,
        (info) => {
          currentPage = info.page
          hooks.onProgress?.(resource, info)
        },
      )) {
        if (!options.dryRun) {
          await writeItem(dir, resource, item)
          await appendIndex(dir, resource, item)
        }
        if (hooks.onItem) await hooks.onItem(resource, item)
        count++
      }

      if (!options.dryRun && currentPage > 0) {
        await writeCheckpoint(dir, {
          startedAt: new Date().toISOString(),
          mode,
          completed,
          inProgress: {
            resource: resource.name,
            lastCompletedPage: currentPage,
          },
        })
      }
    }

    counts[resource.name] = count
    completed.push(resource.name)
  }

  if (!options.dryRun) await deleteCheckpoint(dir)

  return { counts }
}

/**
 * Run reconcile pass: detect deletions by comparing remote ID set vs local.
 * Writes tombstones to _deleted.ndjson.
 *
 * @param {object} args
 * @param {object} args.client
 * @param {string} args.dir
 * @param {object} [args.options]   include/exclude filter
 * @param {object} [args.hooks]
 * @param {(resource:object, id:number) => Promise<void>} [args.hooks.onTombstone]
 */
export async function reconcile({ client, dir, options = {}, hooks = {} }) {
  const resources = filterResources(options).filter(
    (r) => r.layout !== 'single-file',
  )
  const tombstones = []
  for (const resource of resources) {
    const localIds = await readLocalIds(dir, resource)
    if (localIds.size === 0) continue
    const remoteIds = new Set()
    const query = {}
    if (resource.statusAll) query.status = 'all'
    for await (const item of client.paginate(
      resource.path,
      query,
      resource.key,
    )) {
      remoteIds.add(item.id)
    }
    for (const id of localIds) {
      if (!remoteIds.has(id)) {
        const tomb = {
          resource: resource.name,
          id,
          deletedAt: new Date().toISOString(),
        }
        tombstones.push(tomb)
        if (hooks.onTombstone) await hooks.onTombstone(resource, id)
      }
    }
  }

  if (tombstones.length && !options.dryRun) {
    await mkdir(dir, { recursive: true })
    const file = join(dir, '_deleted.ndjson')
    for (const t of tombstones) {
      await appendFile(file, JSON.stringify(t) + '\n')
    }
  }

  return tombstones
}

async function* paginateWithSkip(client, resource, query, skipPages, onProgress) {
  let page = 0
  for await (const item of client.paginate(
    resource.path,
    query,
    resource.key,
    {
      onProgress: (info) => {
        page = info.page
        onProgress?.(info)
      },
    },
  )) {
    if (page <= skipPages) continue
    yield item
  }
}
