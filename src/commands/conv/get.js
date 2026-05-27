import { Args } from '@oclif/core'
import BaseCommand from '../../base-command.js'

const columns = {
  id: { header: 'ID' },
  number: { header: 'Number' },
  subject: { header: 'Subject' },
  status: { header: 'Status' },
  mailboxId: { header: 'Mailbox' },
  customerEmail: {
    header: 'Customer',
    get: (row) => row.primaryCustomer?.email ?? '',
  },
  createdAt: { header: 'Created' },
  closedAt: { header: 'Closed' },
}

export default class ConvGetCommand extends BaseCommand {
  static description = 'Get a conversation by ID'

  static examples = [
    '<%= config.bin %> conv get 123',
    '<%= config.bin %> conv get 123 --output json',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
  }

  static args = {
    id: Args.integer({ required: true, description: 'Conversation ID' }),
  }

  async run() {
    const { args, flags } = await this.parse(ConvGetCommand)
    const data = await this.apiClient.get(`/v2/conversations/${args.id}`)

    if (flags.output === 'json') {
      this.outputResults(data, columns)
      return
    }

    delete data._embedded
    this.outputResults([data], columns)
  }
}
