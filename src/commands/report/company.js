import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'

export default class ReportCompanyCommand extends BaseCommand {
  static description = 'Get company report'

  static examples = [
    '<%= config.bin %> report company --start 2024-01-01T00:00:00Z --end 2024-01-31T23:59:59Z',
    '<%= config.bin %> report company --start 2024-01-01T00:00:00Z --end 2024-01-31T23:59:59Z --mailbox 1',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    start: Flags.string({
      description: 'Start date (ISO 8601)',
      required: true,
    }),
    end: Flags.string({ description: 'End date (ISO 8601)', required: true }),
    mailbox: Flags.integer({ description: 'Filter by mailbox ID' }),
    tag: Flags.string({ description: 'Comma-separated tags' }),
  }

  async run() {
    const { flags } = await this.parse(ReportCompanyCommand)
    this.flags.output = this.flags.output || 'json'

    const query = {
      start: flags.start,
      end: flags.end,
    }

    if (flags.mailbox) query.mailboxes = String(flags.mailbox)
    if (flags.tag) query.tags = flags.tag

    const data = await this.apiClient.get('/v2/reports/company', { query })
    await this.outputResults(data, {})
  }
}
