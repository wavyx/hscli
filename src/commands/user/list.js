import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { collectPages } from '../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  firstName: { header: 'First Name' },
  lastName: { header: 'Last Name' },
  email: { header: 'Email' },
  role: { header: 'Role' },
  createdAt: { header: 'Created' },
}

export default class UserListCommand extends BaseCommand {
  static description = 'List users'

  static examples = [
    '<%= config.bin %> user list',
    '<%= config.bin %> user list --mailbox 42',
    '<%= config.bin %> user list --email jane@example.com',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    mailbox: Flags.integer({ description: 'Filter by mailbox ID' }),
    email: Flags.string({ description: 'Filter by email address' }),
    limit: Flags.integer({ description: 'Max results to return', default: 25 }),
  }

  async run() {
    const { flags } = await this.parse(UserListCommand)

    const query = {
      mailbox: flags.mailbox,
      email: flags.email,
    }

    const items = await collectPages(
      this.apiClient.paginate('/v2/users', query, 'users'),
      flags.limit,
    )
    await this.outputResults(items, columns)
  }
}
