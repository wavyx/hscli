import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { collectPages } from '../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  name: { header: 'Name' },
  slug: { header: 'Slug' },
  createdAt: { header: 'Created' },
  ticketCount: { header: 'Count' },
}

export default class TagListCommand extends BaseCommand {
  static description = 'List tags'

  static examples = [
    '<%= config.bin %> tag list',
    '<%= config.bin %> tag list --limit 50',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    limit: Flags.integer({ description: 'Max results to return', default: 25 }),
  }

  async run() {
    const { flags } = await this.parse(TagListCommand)
    const items = await collectPages(
      this.apiClient.paginate('/v2/tags', {}, 'tags'),
      flags.limit,
    )
    await this.outputResults(items, columns)
  }
}
