import { Flags } from '@oclif/core'
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

export default class CustomerListCommand extends BaseCommand {
  static description = 'List customers'

  static examples = [
    '<%= config.bin %> customer list',
    '<%= config.bin %> customer list --mailbox 42',
    '<%= config.bin %> customer list --since 7d',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    mailbox: Flags.integer({ description: 'Filter by mailbox ID' }),
    first: Flags.string({ description: 'Filter by first name' }),
    last: Flags.string({ description: 'Filter by last name' }),
    since: Flags.string({
      description: 'Modified since (ISO date or relative: 7d, 30d, 1h)',
    }),
    limit: Flags.integer({ description: 'Max results to return', default: 25 }),
  }

  async run() {
    const { flags } = await this.parse(CustomerListCommand)

    const query = {
      mailbox: flags.mailbox,
      firstName: flags.first,
      lastName: flags.last,
      modifiedSince: flags.since ? parseRelativeDate(flags.since) : undefined,
    }

    const items = await collectPages(
      this.apiClient.paginate('/v2/customers', query, 'customers'),
      flags.limit,
    )
    await this.outputResults(items, columns)
  }
}

/**
 * Parse a relative duration string (e.g. "7d", "30d", "1h") into an ISO date,
 * or return the input as-is if it already looks like an ISO date.
 * @param {string} value
 * @returns {string}
 */
function parseRelativeDate(value) {
  const match = value.match(/^(\d+)([dhm])$/)
  if (!match) return value

  const amount = Number(match[1])
  const unit = match[2]
  const now = new Date()

  switch (unit) {
    case 'd':
      now.setDate(now.getDate() - amount)
      break
    case 'h':
      now.setHours(now.getHours() - amount)
      break
    case 'm':
      now.setMinutes(now.getMinutes() - amount)
      break
  }

  return now.toISOString().replace(/\.\d{3}Z$/, 'Z')
}
