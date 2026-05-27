import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { collectPages } from '../../lib/pagination.js'
import { confirmAction } from '../../lib/confirm.js'

export default class ConvBulkStatusCommand extends BaseCommand {
  static description = 'Batch change status on multiple conversations'

  static examples = [
    '<%= config.bin %> conv bulk-status --status active --set closed',
    '<%= config.bin %> conv bulk-status --mailbox 42 --set pending --yes',
    '<%= config.bin %> conv bulk-status --tag vip --set active --limit 50',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    mailbox: Flags.integer({ description: 'Filter by mailbox ID' }),
    status: Flags.string({ description: 'Filter by current status' }),
    tag: Flags.string({ description: 'Filter by tag' }),
    set: Flags.string({
      description: 'Status to set',
      required: true,
      options: ['active', 'pending', 'closed', 'spam'],
    }),
    limit: Flags.integer({
      description: 'Max conversations to update',
      default: 25,
    }),
    yes: Flags.boolean({
      char: 'y',
      description: 'Skip confirmation prompt',
      default: false,
    }),
  }

  async run() {
    const { flags } = await this.parse(ConvBulkStatusCommand)

    const query = {
      status: flags.status,
      mailbox: flags.mailbox,
      tag: flags.tag,
    }

    const items = await collectPages(
      this.apiClient.paginate('/v2/conversations', query, 'conversations'),
      flags.limit,
    )

    if (items.length === 0) {
      this.log('No conversations found matching filters.')
      return
    }

    this.log(`Found ${items.length} conversations to update`)

    const confirmed = await confirmAction(
      `Change status to "${flags.set}" for ${items.length} conversations?`,
      flags.yes,
    )

    if (!confirmed) {
      this.log('Cancelled.')
      return
    }

    for (let i = 0; i < items.length; i++) {
      const conv = items[i]
      await this.apiClient.jsonPatch(`/v2/conversations/${conv.id}`, {
        op: 'replace',
        path: '/status',
        value: flags.set,
      })
      this.log(`Updated ${i + 1}/${items.length}...`)
    }

    this.log(`Updated ${items.length} conversations to ${flags.set}`)
  }
}
