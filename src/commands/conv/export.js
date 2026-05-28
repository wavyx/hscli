import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { ConfigError } from '../../lib/errors.js'
import { formatCsv } from '../../lib/output/csv.js'
import { formatJson } from '../../lib/output/json.js'
import { VALID_SOURCES } from './list.js'

const VALID_EMBEDS = ['threads']

const columns = {
  id: { header: 'ID' },
  number: { header: 'Number' },
  subject: { header: 'Subject' },
  status: { header: 'Status' },
  mailboxId: { header: 'Mailbox' },
  createdAt: { header: 'Created' },
}

export default class ConvExportCommand extends BaseCommand {
  static description = 'Bulk export conversations'

  static examples = [
    '<%= config.bin %> conv export --format json > data.json',
    '<%= config.bin %> conv export --mailbox 42 --format csv > report.csv',
    '<%= config.bin %> conv export --since 30d --format ndjson',
    '<%= config.bin %> conv export --status closed --tag vip',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    mailbox: Flags.integer({ description: 'Filter by mailbox ID' }),
    status: Flags.string({
      description: 'Filter by status',
      options: ['active', 'pending', 'closed', 'spam', 'all'],
      default: 'all',
    }),
    since: Flags.string({
      description: 'Modified since (ISO date or relative: 7d, 30d, 1h)',
    }),
    format: Flags.string({
      description: 'Output format',
      options: ['json', 'csv', 'ndjson'],
      default: 'json',
    }),
    tag: Flags.string({ description: 'Filter by tag' }),
    embed: Flags.string({
      description: `Embed related resources (csv: ${VALID_EMBEDS.join(',')})`,
    }),
    source: Flags.string({
      description: `Filter by source.type (client-side post-fetch): ${VALID_SOURCES.join(', ')}`,
    }),
  }

  async run() {
    const { flags } = await this.parse(ConvExportCommand)

    let embed
    if (flags.embed) {
      embed = flags.embed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const bad = embed.filter((e) => !VALID_EMBEDS.includes(e))
      if (bad.length) {
        throw new ConfigError(
          `Unknown --embed value(s): ${bad.join(', ')}. Valid: ${VALID_EMBEDS.join(', ')}`,
        )
      }
      if (flags.format === 'csv') {
        throw new ConfigError(
          '--embed not supported with --format csv (use json or ndjson)',
        )
      }
    }

    if (flags.source && !VALID_SOURCES.includes(flags.source)) {
      throw new ConfigError(
        `Unknown --source '${flags.source}'. Valid: ${VALID_SOURCES.join(', ')}`,
      )
    }

    const query = {
      status: flags.status,
      mailbox: flags.mailbox,
      tag: flags.tag,
      modifiedSince: flags.since ? parseRelativeDate(flags.since) : undefined,
      ...(embed ? { embed } : {}),
    }

    const ora = (await import('ora')).default
    const spinner = ora({
      text: 'Exporting... page 1',
      stream: process.stderr,
    }).start()

    const allItems = []
    let page = 1
    while (true) {
      const data = await this.apiClient.get('/v2/conversations', {
        query: { ...query, page },
      })

      const items = data?._embedded?.conversations ?? []
      const kept = flags.source
        ? items.filter((c) => c?.source?.type === flags.source)
        : items
      allItems.push(...kept)
      const totalPages = data?.page?.totalPages ?? 1
      spinner.text = `Exporting... page ${page}/${totalPages} (${allItems.length} conversations)`
      if (page >= totalPages) break
      page++
    }

    spinner.succeed(`Exported ${allItems.length} conversations`)

    switch (flags.format) {
      case 'ndjson':
        allItems.forEach((item) => this.log(JSON.stringify(item)))
        break
      case 'csv':
        this.log(formatCsv(allItems, columns))
        break
      case 'json':
      default:
        this.log(formatJson(allItems))
        break
    }
  }
}

/**
 * Parse a relative duration string (e.g. "7d", "30d", "1h") into an ISO date,
 * or return the input as-is if it already looks like an ISO date.
 * @param {string} value
 * @returns {string}
 */
function parseRelativeDate(value) {
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
