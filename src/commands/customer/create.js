import { Flags } from '@oclif/core'
import chalk from 'chalk'
import BaseCommand from '../../base-command.js'

export default class CustomerCreateCommand extends BaseCommand {
  static description = 'Create a new customer'

  static examples = [
    '<%= config.bin %> customer create --email user@example.com',
    '<%= config.bin %> customer create --email user@example.com --first Jane --last Doe --company Acme',
    '<%= config.bin %> customer create --email user@example.com --phone 555-1234 --job-title "Support Lead"',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    email: Flags.string({ description: 'Customer email address', required: true }),
    first: Flags.string({ description: 'First name' }),
    last: Flags.string({ description: 'Last name' }),
    company: Flags.string({ description: 'Company / organization name' }),
    phone: Flags.string({ description: 'Phone number' }),
    'job-title': Flags.string({ description: 'Job title' }),
  }

  async run() {
    const { flags } = await this.parse(CustomerCreateCommand)

    const payload = { emails: [{ value: flags.email }] }
    if (flags.first) payload.firstName = flags.first
    if (flags.last) payload.lastName = flags.last
    if (flags.company) payload.organization = flags.company
    if (flags.phone) payload.phones = [{ value: flags.phone }]
    if (flags['job-title']) payload.jobTitle = flags['job-title']

    const result = await this.apiClient.post('/v2/customers', { body: payload })
    const id = result?.id

    this.log(`Created customer ${chalk.cyan(id)}`)

    if (flags.output === 'json') {
      this.log(JSON.stringify({ id }, null, 2))
    }
  }
}
