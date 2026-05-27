import { Args } from '@oclif/core'
import BaseCommand from '../../base-command.js'

const columns = {
  id: { header: 'ID' },
  name: { header: 'Name' },
  slug: { header: 'Slug' },
  email: { header: 'Email' },
  createdAt: { header: 'Created' },
  updatedAt: { header: 'Updated' },
}

export default class MailboxGetCommand extends BaseCommand {
  static description = 'Get a mailbox by ID'

  static examples = ['<%= config.bin %> mailbox get 123']

  static flags = {
    ...BaseCommand.baseFlags,
  }

  static args = {
    id: Args.integer({ required: true, description: 'Mailbox ID' }),
  }

  async run() {
    const { args } = await this.parse(MailboxGetCommand)
    const data = await this.apiClient.get(`/v2/mailboxes/${args.id}`)
    await this.outputResults([data], columns)
  }
}
