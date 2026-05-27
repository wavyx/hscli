import { Args } from '@oclif/core'
import BaseCommand from '../../base-command.js'

const columns = {
  id: { header: 'ID' },
  firstName: { header: 'First Name' },
  lastName: { header: 'Last Name' },
  email: { header: 'Email' },
  role: { header: 'Role' },
  timezone: { header: 'Timezone' },
  createdAt: { header: 'Created' },
}

export default class UserGetCommand extends BaseCommand {
  static description = 'Get a user by ID'

  static examples = ['<%= config.bin %> user get 123']

  static flags = {
    ...BaseCommand.baseFlags,
  }

  static args = {
    id: Args.integer({ required: true, description: 'User ID' }),
  }

  async run() {
    const { args } = await this.parse(UserGetCommand)
    const data = await this.apiClient.get(`/v2/users/${args.id}`)
    await this.outputResults([data], columns)
  }
}
