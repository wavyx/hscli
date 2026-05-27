import { Args, Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { collectPages } from '../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  firstName: { header: 'First Name' },
  lastName: { header: 'Last Name' },
  email: {
    header: 'Email',
    get: (row) => row.emails?.[0]?.value ?? '',
  },
  company: {
    header: 'Company',
    get: (row) => row.organization ?? '',
  },
  createdAt: { header: 'Created' },
}

export default class CustomerSearchCommand extends BaseCommand {
  static description = 'Search customers'

  static examples = [
    '<%= config.bin %> customer search "john"',
    '<%= config.bin %> customer search "acme" --limit 10',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    limit: Flags.integer({ description: 'Max results to return', default: 25 }),
  }

  static args = {
    query: Args.string({ required: true, description: 'Search query' }),
  }

  async run() {
    const { args, flags } = await this.parse(CustomerSearchCommand)
    const items = await collectPages(
      this.apiClient.paginate(
        '/v2/customers',
        { query: args.query },
        'customers',
      ),
      flags.limit,
    )
    await this.outputResults(items, columns)
  }
}
