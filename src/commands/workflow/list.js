import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { collectPages } from '../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  name: { header: 'Name' },
  type: { header: 'Type' },
  status: { header: 'Status' },
  mailboxId: { header: 'Mailbox' },
  createdAt: { header: 'Created' },
}

export default class WorkflowListCommand extends BaseCommand {
  static description = 'List workflows'

  static examples = [
    '<%= config.bin %> workflow list',
    '<%= config.bin %> workflow list --mailbox 1 --type manual',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    mailbox: Flags.integer({ description: 'Filter by mailbox ID' }),
    type: Flags.string({
      description: 'Filter by workflow type',
      options: ['manual', 'automatic'],
    }),
    limit: Flags.integer({ description: 'Max results to return', default: 25 }),
  }

  async run() {
    const { flags } = await this.parse(WorkflowListCommand)

    const query = {
      mailboxId: flags.mailbox,
      type: flags.type,
    }

    const items = await collectPages(
      this.apiClient.paginate('/v2/workflows', query, 'workflows'),
      flags.limit,
    )
    await this.outputResults(items, columns)
  }
}
