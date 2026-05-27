import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { collectPages } from '../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  number: { header: 'Number' },
  subject: { header: 'Subject' },
  status: { header: 'Status' },
  mailboxId: { header: 'Mailbox' },
  assignee: {
    header: 'Assignee',
    get: (row) => {
      if (!row.assignee) return ''
      return [row.assignee.first, row.assignee.last].filter(Boolean).join(' ')
    },
  },
  createdAt: { header: 'Created' },
}

export default class ConvListCommand extends BaseCommand {
  static description = 'List conversations'

  static examples = [
    '<%= config.bin %> conv list',
    '<%= config.bin %> conv list --status closed --mailbox 123',
    '<%= config.bin %> conv list --since 7d',
    '<%= config.bin %> conv list --query "billing issue"',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    mailbox: Flags.integer({ description: 'Filter by mailbox ID' }),
    status: Flags.string({
      description: 'Filter by status',
      options: ['active', 'pending', 'closed', 'spam', 'all'],
      default: 'active',
    }),
    tag: Flags.string({ description: 'Filter by tag' }),
    'assigned-to': Flags.string({
      description: 'Filter by assignee (user ID)',
    }),
    query: Flags.string({ description: 'Search query' }),
    since: Flags.string({
      description: 'Modified since (ISO date or relative: 7d, 30d, 1h)',
    }),
    limit: Flags.integer({ description: 'Max results to return', default: 25 }),
  }

  async run() {
    const { flags } = await this.parse(ConvListCommand)

    const query = {
      status: flags.status,
      mailbox: flags.mailbox,
      tag: flags.tag,
      assigned_to: flags['assigned-to'],
      query: flags.query,
      modifiedSince: flags.since ? parseRelativeDate(flags.since) : undefined,
    }

    const items = await collectPages(
      this.apiClient.paginate('/v2/conversations', query, 'conversations'),
      flags.limit,
    )
    this.outputResults(items, columns)
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
