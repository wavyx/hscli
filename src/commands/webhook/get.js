import { Args } from '@oclif/core'
import BaseCommand from '../../base-command.js'

const columns = {
  id: { header: 'ID' },
  url: { header: 'URL' },
  events: {
    header: 'Events',
    get: (row) => (row.events || []).join(', '),
  },
  state: { header: 'State' },
  secret: { header: 'Secret' },
  createdAt: { header: 'Created' },
}

export default class WebhookGetCommand extends BaseCommand {
  static description = 'Get a webhook by ID'

  static examples = ['<%= config.bin %> webhook get 1']

  static flags = {
    ...BaseCommand.baseFlags,
  }

  static args = {
    id: Args.integer({ required: true, description: 'Webhook ID' }),
  }

  async run() {
    const { args } = await this.parse(WebhookGetCommand)
    const data = await this.apiClient.get(`/v2/webhooks/${args.id}`)
    await this.outputResults([data], columns)
  }
}
