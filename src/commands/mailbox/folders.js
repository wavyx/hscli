import { Args } from '@oclif/core'
import BaseCommand from '../../base-command.js'

const columns = {
  id: { header: 'ID' },
  name: { header: 'Name' },
  type: { header: 'Type' },
  activeCount: { header: 'Active' },
  totalCount: { header: 'Total' },
}

export default class MailboxFoldersCommand extends BaseCommand {
  static description = 'List folders for a mailbox'

  static examples = [
    '<%= config.bin %> mailbox folders 123',
    '<%= config.bin %> mailbox folders 123 --output json',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
  }

  static args = {
    id: Args.integer({ required: true, description: 'Mailbox ID' }),
  }

  async run() {
    const { args } = await this.parse(MailboxFoldersCommand)
    const data = await this.apiClient.get(`/v2/mailboxes/${args.id}/folders`)
    const folders = data?._embedded?.folders ?? []
    await this.outputResults(folders, columns)
  }
}
