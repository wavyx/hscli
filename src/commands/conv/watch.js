import { Flags } from '@oclif/core'
import chalk from 'chalk'
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

export default class ConvWatchCommand extends BaseCommand {
  static description = 'Live tail of conversations (poll-based)'

  static examples = [
    '<%= config.bin %> conv watch',
    '<%= config.bin %> conv watch --mailbox 42 --poll 10',
    '<%= config.bin %> conv watch --status pending --limit 5',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    mailbox: Flags.integer({ description: 'Filter by mailbox ID' }),
    status: Flags.string({
      description: 'Filter by status',
      default: 'active',
    }),
    poll: Flags.integer({
      description: 'Seconds between polls',
      default: 30,
    }),
    limit: Flags.integer({
      description: 'Max conversations per poll',
      default: 10,
    }),
    once: Flags.boolean({
      description: 'Exit after first poll',
      hidden: true,
      default: false,
    }),
  }

  async run() {
    const { flags } = await this.parse(ConvWatchCommand)

    let lastSeen = null

    const poll = async () => {
      const query = {
        status: flags.status,
        mailbox: flags.mailbox,
      }

      if (lastSeen) {
        query.modifiedSince = lastSeen
      }

      const items = await collectPages(
        this.apiClient.paginate('/v2/conversations', query, 'conversations'),
        flags.limit,
      )

      const now = new Date()
      const timestamp = [
        now.getHours().toString().padStart(2, '0'),
        now.getMinutes().toString().padStart(2, '0'),
        now.getSeconds().toString().padStart(2, '0'),
      ].join(':')
      this.log(chalk.dim(`--- ${timestamp} ---`))

      if (items.length > 0) {
        await this.outputResults(items, columns)

        // Find the latest createdAt among fetched items
        const latest = items.reduce((max, item) => {
          const t = new Date(item.createdAt).getTime()
          return t > max ? t : max
        }, 0)
        if (latest > 0) {
          // Strip milliseconds — Help Scout rejects them
          lastSeen = new Date(latest).toISOString().replace(/\.\d{3}Z$/, 'Z')
        }
      } else {
        this.log('No new conversations.')
      }
    }

    // First poll
    await poll()

    if (flags.once) return

    // Subsequent polls via setTimeout + async loop
    const loop = async () => {
      while (true) {
        await new Promise((resolve) =>
          setTimeout(resolve, flags.poll * 1000),
        )
        await poll()
      }
    }

    await loop()
  }
}
