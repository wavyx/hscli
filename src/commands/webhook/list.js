import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { collectPages } from '../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  url: { header: 'URL' },
  events: {
    header: 'Events',
    get: (row) => (row.events || []).join(', '),
  },
  state: { header: 'State' },
  createdAt: { header: 'Created' },
}

export default class WebhookListCommand extends BaseCommand {
  static description = 'List webhooks'

  static examples = [
    '<%= config.bin %> webhook list',
    '<%= config.bin %> webhook list --output json',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    limit: Flags.integer({ description: 'Max results to return', default: 25 }),
  }

  async run() {
    const { flags } = await this.parse(WebhookListCommand)

    const items = await collectPages(
      this.apiClient.paginate('/v2/webhooks', {}, 'webhooks'),
      flags.limit,
    )
    await this.outputResults(items, columns)
  }
}
