import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'

export default class ReportUserCommand extends BaseCommand {
  static description = 'Get user report'

  static examples = [
    '<%= config.bin %> report user --start 2024-01-01T00:00:00Z --end 2024-01-31T23:59:59Z --user 10',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    start: Flags.string({
      description: 'Start date (ISO 8601)',
      required: true,
    }),
    end: Flags.string({ description: 'End date (ISO 8601)', required: true }),
    user: Flags.integer({ description: 'User ID', required: true }),
  }

  async run() {
    const { flags } = await this.parse(ReportUserCommand)
    this.flags.output = this.flags.output || 'json'

    const query = {
      start: flags.start,
      end: flags.end,
      user: flags.user,
    }

    const data = await this.apiClient.get('/v2/reports/user', { query })
    await this.outputResults(data, {})
  }
}
