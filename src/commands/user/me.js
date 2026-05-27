import BaseCommand from '../../base-command.js'

const columns = {
  id: { header: 'ID' },
  firstName: { header: 'First Name' },
  lastName: { header: 'Last Name' },
  email: { header: 'Email' },
  role: { header: 'Role' },
  timezone: { header: 'Timezone' },
}

export default class UserMeCommand extends BaseCommand {
  static description = 'Get the authenticated user'

  static examples = ['<%= config.bin %> user me']

  static flags = {
    ...BaseCommand.baseFlags,
  }

  async run() {
    const data = await this.apiClient.get('/v2/users/me')
    await this.outputResults([data], columns)
  }
}
