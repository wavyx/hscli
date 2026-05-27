import { Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import BaseCommand from '../../base-command.js'

const FLAG_TO_PATH = {
  first: '/firstName',
  last: '/lastName',
  company: '/organization',
  'job-title': '/jobTitle',
}

export default class CustomerUpdateCommand extends BaseCommand {
  static description = 'Update a customer'

  static examples = [
    '<%= config.bin %> customer update 42 --first Jane --last Doe',
    '<%= config.bin %> customer update 42 --email new@example.com --company Acme',
    '<%= config.bin %> customer update 42 --job-title "VP of Engineering"',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    email: Flags.string({ description: 'Customer email address' }),
    first: Flags.string({ description: 'First name' }),
    last: Flags.string({ description: 'Last name' }),
    company: Flags.string({ description: 'Company / organization name' }),
    phone: Flags.string({ description: 'Phone number' }),
    'job-title': Flags.string({ description: 'Job title' }),
  }

  static args = {
    id: Args.integer({ required: true, description: 'Customer ID' }),
  }

  async run() {
    const { args, flags } = await this.parse(CustomerUpdateCommand)

    const operations = []

    for (const [flag, path] of Object.entries(FLAG_TO_PATH)) {
      if (flags[flag]) {
        operations.push({ op: 'replace', path, value: flags[flag] })
      }
    }

    if (flags.email) {
      operations.push({
        op: 'replace',
        path: '/emails',
        value: [{ value: flags.email }],
      })
    }

    if (flags.phone) {
      operations.push({
        op: 'replace',
        path: '/phones',
        value: [{ value: flags.phone }],
      })
    }

    if (operations.length === 0) {
      this.log('No fields to update.')
      return
    }

    await this.apiClient.jsonPatch(`/v2/customers/${args.id}`, operations)
    this.log(`Updated customer ${chalk.cyan('#' + args.id)}`)
  }
}
