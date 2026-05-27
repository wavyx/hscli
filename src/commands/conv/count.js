import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'

export default class ConvCountCommand extends BaseCommand {
  static description = 'Count conversations'

  static examples = [
    '<%= config.bin %> conv count',
    '<%= config.bin %> conv count --status active',
    '<%= config.bin %> conv count --mailbox 123 --tag billing',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    status: Flags.string({
      description: 'Filter by status',
      options: ['active', 'pending', 'closed', 'spam', 'all'],
      default: 'all',
    }),
    mailbox: Flags.integer({ description: 'Filter by mailbox ID' }),
    tag: Flags.string({ description: 'Filter by tag' }),
  }

  async run() {
    const { flags } = await this.parse(ConvCountCommand)

    const query = {
      status: flags.status,
      mailbox: flags.mailbox,
      tag: flags.tag,
      page: 1,
    }

    const data = await this.apiClient.get('/v2/conversations', { query })
    const count = data?.page?.totalElements ?? 0

    if (flags.output === 'json') {
      this.log(JSON.stringify({ count }))
    } else {
      this.log(String(count))
    }
  }
}
