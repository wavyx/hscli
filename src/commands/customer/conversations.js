import { Args, Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { collectPages } from '../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  number: { header: 'Number' },
  subject: { header: 'Subject' },
  status: { header: 'Status' },
  mailboxId: { header: 'Mailbox' },
  createdAt: { header: 'Created' },
}

export default class CustomerConversationsCommand extends BaseCommand {
  static description = 'List conversations for a customer'

  static examples = [
    '<%= config.bin %> customer conversations 123',
    '<%= config.bin %> customer conversations 123 --limit 10',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    limit: Flags.integer({ description: 'Max results to return', default: 25 }),
  }

  static args = {
    id: Args.integer({ required: true, description: 'Customer ID' }),
  }

  async run() {
    const { args, flags } = await this.parse(CustomerConversationsCommand)
    const items = await collectPages(
      this.apiClient.paginate(
        `/v2/customers/${args.id}/conversations`,
        {},
        'conversations',
      ),
      flags.limit,
    )
    await this.outputResults(items, columns)
  }
}
