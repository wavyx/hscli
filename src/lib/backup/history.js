import { mkdir, appendFile } from 'node:fs/promises'
import { join } from 'node:path'

export class HistoryLog {
  /**
   * @param {string} baseDir
   * @param {string} mode
   * @param {Date} [now]
   */
  constructor(baseDir, mode, now = new Date()) {
    this.baseDir = baseDir
    this.mode = mode
    const ts = now.toISOString().replace(/[:.]/g, '-').replace(/Z$/, '')
    this.dir = join(baseDir, '_history')
    this.file = join(this.dir, `${ts}-${mode}.ndjson`)
    this._ensured = false
  }

  async _ensure() {
    if (this._ensured) return
    await mkdir(this.dir, { recursive: true })
    this._ensured = true
  }

  /**
   * @param {string} resource
   * @param {object} item
   */
  async upsert(resource, item) {
    await this._ensure()
    await appendFile(
      this.file,
      JSON.stringify({
        op: 'upsert',
        resource,
        id: item.id,
        snapshot: item,
      }) + '\n',
    )
  }

  /**
   * @param {string} resource
   * @param {number|string} id
   */
  async tombstone(resource, id) {
    await this._ensure()
    await appendFile(
      this.file,
      JSON.stringify({
        op: 'delete',
        resource,
        id,
        tombstoneAt: new Date().toISOString(),
      }) + '\n',
    )
  }
}
