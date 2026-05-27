import { Args } from '@oclif/core'
import BaseCommand from '../../base-command.js'

const columns = {
  id: { header: 'ID' },
  firstName: { header: 'First Name' },
  lastName: { header: 'Last Name' },
  email: {
    header: 'Email',
    get: (row) => row.emails?.[0]?.value ?? '',
  },
  organization: { header: 'Organization' },
  jobTitle: { header: 'Job Title' },
  createdAt: { header: 'Created' },
}

export default class CustomerGetCommand extends BaseCommand {
  static description = 'Get a customer by ID'

  static examples = ['<%= config.bin %> customer get 123']

  static flags = {
    ...BaseCommand.baseFlags,
  }

  static args = {
    id: Args.integer({ required: true, description: 'Customer ID' }),
  }

  async run() {
    const { args } = await this.parse(CustomerGetCommand)
    const data = await this.apiClient.get(`/v2/customers/${args.id}`)
    await this.outputResults([data], columns)
  }
}
