import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'

const columns = {
  type: { header: 'Source Type' },
  via: { header: 'Via' },
  count: { header: 'Count' },
  pct: {
    header: '%',
    get: (row) => `${row.pct}%`,
  },
}

export default class ReportBeaconCommand extends BaseCommand {
  static description =
    'Aggregate conversation counts by source.type and source.via (derived from Mailbox API; useful for Beacon-origin analysis)'

  static examples = [
    '<%= config.bin %> report beacon',
    '<%= config.bin %> report beacon --since 30d',
    '<%= config.bin %> report beacon --since 30d --mailbox 42',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    since: Flags.string({
      description:
        'Window start (ISO date or relative: 7d, 30d, 1h). Default: 30d',
      default: '30d',
    }),
    mailbox: Flags.integer({ description: 'Filter by mailbox ID' }),
  }

  async run() {
    const { flags } = await this.parse(ReportBeaconCommand)

    const since = parseRelativeDate(flags.since)
    const query = {
      status: 'all',
      modifiedSince: since,
    }
    if (flags.mailbox) query.mailbox = flags.mailbox

    const counts = new Map()
    let total = 0
    for await (const conv of this.apiClient.paginate(
      '/v2/conversations',
      query,
      'conversations',
    )) {
      const type = conv?.source?.type ?? 'unknown'
      const via = conv?.source?.via ?? 'unknown'
      const key = `${type}/${via}`
      const prev = counts.get(key) ?? { type, via, count: 0 }
      prev.count += 1
      counts.set(key, prev)
      total += 1
    }

    const rows = Array.from(counts.values())
      .map((r) => ({
        ...r,
        pct: Math.round((r.count / total) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count)

    await this.outputResults(rows, columns)
  }
}

/**
 * @param {string} value
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
