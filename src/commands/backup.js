import { existsSync, readdirSync } from 'node:fs'
import { Flags } from '@oclif/core'
import BaseCommand from '../base-command.js'
import { ConfigError } from '../lib/errors.js'
import {
  readManifest,
  writeManifest,
  isBackupDir,
  newManifest,
} from '../lib/backup/manifest.js'
import { readCheckpoint } from '../lib/backup/checkpoint.js'
import { runBackup, reconcile } from '../lib/backup/runner.js'
import { HistoryLog } from '../lib/backup/history.js'
import { processConversationAttachments } from '../lib/backup/attachments.js'
import { compressDir } from '../lib/backup/archive.js'

export default class BackupCommand extends BaseCommand {
  static description =
    'Full account backup with incremental refresh, resume, deletion detection, attachment downloads, and optional compression'

  static examples = [
    '<%= config.bin %> backup --out ~/hs-backup',
    '<%= config.bin %> backup --out ~/hs-backup --reconcile --keep-history',
    '<%= config.bin %> backup --out ~/hs-backup --full --attachments --compress',
    '<%= config.bin %> backup --out ~/hs-backup --include conversations,customers',
    '<%= config.bin %> backup --out ~/hs-backup --dry-run',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    out: Flags.string({
      required: true,
      description: 'Target output directory',
    }),
    full: Flags.boolean({
      default: false,
      description: 'Force full re-sync, ignore manifest lastSyncedAt',
    }),
    resume: Flags.boolean({
      default: false,
      description: 'Continue interrupted run from checkpoint',
    }),
    reconcile: Flags.boolean({
      default: false,
      description:
        'After fetch, ID-scan to detect deletions (writes tombstones)',
    }),
    'keep-history': Flags.boolean({
      default: false,
      description: 'Append delta log to _history/',
    }),
    since: Flags.string({
      description: 'Override lastSyncedAt (ISO date or relative: 7d, 30d, 1h)',
    }),
    include: Flags.string({
      description: 'CSV resource subset',
    }),
    exclude: Flags.string({
      description: 'CSV resource exclusion',
    }),
    attachments: Flags.boolean({
      default: false,
      description: 'Download attachment binaries (immutable, skips existing)',
    }),
    compress: Flags.boolean({
      default: false,
      description:
        'Final tar.gz step (incompatible with future incremental on same dir)',
    }),
    parallel: Flags.integer({
      default: 4,
      description: 'Concurrent attachment downloads',
    }),
    'dry-run': Flags.boolean({
      default: false,
      description: 'Show plan, no writes',
    }),
  }

  async run() {
    const { flags } = await this.parse(BackupCommand)
    const dir = flags.out

    if (
      existsSync(dir) &&
      readdirSync(dir).length &&
      !(await isBackupDir(dir))
    ) {
      throw new ConfigError(
        `${dir} exists but is not a hscli backup directory (no manifest.json). Refusing to write here.`,
      )
    }

    let manifest = await readManifest(dir)
    const mode = !manifest || flags.full ? 'full' : 'incremental'

    if (!manifest) {
      const me = await this.apiClient.get('/v2/users/me').catch(() => null)
      manifest = newManifest(
        me
          ? {
              id: me.id,
              name: `${me.firstName || ''} ${me.lastName || ''}`.trim(),
            }
          : {},
        this.config.version,
      )
    }

    let checkpoint = null
    if (flags.resume) {
      checkpoint = await readCheckpoint(dir)
    }

    const since = flags.since ? parseSince(flags.since) : null

    const options = {
      include: flags.include
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      exclude: flags.exclude
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      since,
      dryRun: flags['dry-run'],
      completed: checkpoint?.completed,
      inProgress: checkpoint?.inProgress,
    }

    const startedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

    let history = null
    if (flags['keep-history'] && !flags['dry-run']) {
      history = new HistoryLog(dir, mode)
    }

    const hooks = {
      onItem: async (resource, item) => {
        if (history) await history.upsert(resource.name, item)
        if (
          flags.attachments &&
          resource.name === 'conversations' &&
          !flags['dry-run']
        ) {
          await processConversationAttachments({
            client: this.apiClient,
            baseDir: dir,
            conversation: item,
            parallel: flags.parallel,
          })
        }
      },
    }

    const { counts } = await runBackup({
      client: this.apiClient,
      dir,
      mode,
      manifest,
      options,
      hooks,
    })

    let tombstones = []
    if (flags.reconcile) {
      tombstones = await reconcile({
        client: this.apiClient,
        dir,
        options,
        hooks: {
          onTombstone: async (resource, id) => {
            if (history) await history.tombstone(resource.name, id)
          },
        },
      })
    }

    if (!flags['dry-run']) {
      const finishedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
      manifest.history.push({ startedAt, finishedAt, mode, counts })
      for (const [name, total] of Object.entries(counts)) {
        manifest.resources[name] = { lastSyncedAt: startedAt, total }
      }
      await writeManifest(dir, manifest)
    }

    let archive
    if (flags.compress && !flags['dry-run']) {
      archive = await compressDir(dir)
    }

    const summary = Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(' · ')
    process.stderr.write(
      `${flags['dry-run'] ? '[dry-run] ' : ''}Done (${mode}). ${summary}${
        tombstones.length ? ` · ${tombstones.length} deletions` : ''
      }${archive ? ` · archive: ${archive}` : ''}\n`,
    )
  }
}

/**
 * Parse relative duration (7d/30d/1h) into an ISO date string or return as-is.
 * @param {string} value
 */
function parseSince(value) {
  const match = value.match(/^(\d+)([dhm])$/)
  if (!match) return value
  const amount = Number(match[1])
  const unit = match[2]
  const now = new Date()
  switch (unit) {
    case 'd':
      now.setDate(now.getDate() - amount)
      break
    case 'h':
      now.setHours(now.getHours() - amount)
      break
    case 'm':
      now.setMinutes(now.getMinutes() - amount)
      break
  }
  return now.toISOString().replace(/\.\d{3}Z$/, 'Z')
}
