import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { safeName } from './writer.js'

/**
 * Download a single attachment binary if not already present.
 * Help Scout returns attachment data as `{ data: <base64> }`.
 *
 * @param {object} client
 * @param {string} baseDir backup output dir
 * @param {number|string} convId
 * @param {{id:number, filename:string, mimeType?:string, size?:number}} att
 */
export async function downloadAttachment(client, baseDir, convId, att) {
  const dir = join(baseDir, 'conversations', String(convId), 'attachments')
  await mkdir(dir, { recursive: true })
  const file = join(dir, `${att.id}_${safeName(att.filename || 'file')}`)
  try {
    await access(file)
    return { skipped: true, file }
  } catch {
    // not present, download
  }
  const resp = await client.get(`/v2/attachments/${att.id}/data`)
  const base64 = resp?.data ?? ''
  await writeFile(file, Buffer.from(base64, 'base64'))
  return { skipped: false, file }
}

/**
 * Update the conversation's attachments _manifest.json with metadata.
 * @param {string} baseDir
 * @param {number|string} convId
 * @param {Array<object>} entries
 */
export async function writeAttachmentsManifest(baseDir, convId, entries) {
  const dir = join(baseDir, 'conversations', String(convId), 'attachments')
  await mkdir(dir, { recursive: true })
  const file = join(dir, '_manifest.json')
  let existing = {}
  try {
    existing = JSON.parse(await readFile(file, 'utf8'))
  } catch {
    /* missing or invalid */
  }
  for (const e of entries) existing[String(e.id)] = e
  await writeFile(file, JSON.stringify(existing, null, 2))
}

/**
 * Walk a conversation's embedded threads and download any new attachments.
 * Respects a concurrency limit.
 *
 * @param {object} args
 * @param {object} args.client
 * @param {string} args.baseDir
 * @param {object} args.conversation conversation with _embedded.threads
 * @param {number} [args.parallel] concurrency cap
 */
export async function processConversationAttachments({
  client,
  baseDir,
  conversation,
  parallel = 4,
}) {
  const threads = conversation?._embedded?.threads ?? []
  const tasks = []
  for (const t of threads) {
    for (const a of t.attachments || []) {
      tasks.push({ thread: t, att: a })
    }
  }
  if (!tasks.length) return { downloaded: 0, skipped: 0 }

  const entries = []
  let downloaded = 0
  let skipped = 0

  const queue = [...tasks]
  async function worker() {
    while (queue.length) {
      const next = queue.shift()
      const r = await downloadAttachment(
        client,
        baseDir,
        conversation.id,
        next.att,
      )
      if (r.skipped) skipped++
      else downloaded++
      entries.push({
        id: next.att.id,
        threadId: next.thread.id,
        filename: next.att.filename,
        mimeType: next.att.mimeType,
        size: next.att.size,
        downloadedAt: new Date().toISOString(),
      })
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, parallel) }, worker))
  await writeAttachmentsManifest(baseDir, conversation.id, entries)
  return { downloaded, skipped }
}
