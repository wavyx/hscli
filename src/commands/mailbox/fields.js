import { Args } from '@oclif/core'
import BaseCommand from '../../base-command.js'

const columns = {
  id: { header: 'ID' },
  name: { header: 'Name' },
  type: { header: 'Type' },
  required: { header: 'Required' },
  order: { header: 'Order' },
}

export default class MailboxFieldsCommand extends BaseCommand {
  static description = 'List custom fields for a mailbox'

  static examples = [
    '<%= config.bin %> mailbox fields 123',
    '<%= config.bin %> mailbox fields 123 --output json',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
  }

  static args = {
    id: Args.integer({ required: true, description: 'Mailbox ID' }),
  }

  async run() {
    const { args } = await this.parse(MailboxFieldsCommand)
    const data = await this.apiClient.get(`/v2/mailboxes/${args.id}/fields`)
    const fields = data?._embedded?.fields ?? []
    await this.outputResults(fields, columns)
  }
}
