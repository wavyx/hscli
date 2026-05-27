import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { collectPages } from '../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  name: { header: 'Name' },
  email: { header: 'Email' },
  createdAt: { header: 'Created' },
}

export default class MailboxListCommand extends BaseCommand {
  static description = 'List mailboxes'

  static examples = [
    '<%= config.bin %> mailbox list',
    '<%= config.bin %> mailbox list --limit 50',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    limit: Flags.integer({ description: 'Max results to return', default: 25 }),
  }

  async run() {
    const { flags } = await this.parse(MailboxListCommand)
    const items = await collectPages(
      this.apiClient.paginate('/v2/mailboxes', {}, 'mailboxes'),
      flags.limit,
    )
    this.outputResults(items, columns)
  }
}
