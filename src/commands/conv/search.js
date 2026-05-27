import { Args, Flags } from '@oclif/core'
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

export default class ConvSearchCommand extends BaseCommand {
  static description = 'Search conversations'

  static examples = [
    '<%= config.bin %> conv search "billing issue"',
    '<%= config.bin %> conv search "refund" --mailbox 123',
    '<%= config.bin %> conv search "api" --limit 10',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    mailbox: Flags.integer({ description: 'Filter by mailbox ID' }),
    limit: Flags.integer({ description: 'Max results to return', default: 25 }),
  }

  static args = {
    query: Args.string({ required: true, description: 'Search query' }),
  }

  async run() {
    const { args, flags } = await this.parse(ConvSearchCommand)

    const query = {
      query: args.query,
      mailbox: flags.mailbox,
    }

    const items = await collectPages(
      this.apiClient.paginate('/v2/conversations', query, 'conversations'),
      flags.limit,
    )
    await this.outputResults(items, columns)
  }
}
