import { Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'
import { collectPages } from '../../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  number: { header: '#' },
  name: { header: 'Name' },
  visibility: { header: 'Visibility' },
  articleCount: { header: 'Articles' },
  updatedAt: { header: 'Updated' },
}

export default class DocsCollectionListCommand extends DocsBaseCommand {
  static description = 'List Docs collections'

  static examples = [
    '<%= config.bin %> docs collection list',
    '<%= config.bin %> docs collection list --site <siteId>',
    '<%= config.bin %> docs collection list --visibility public --output json',
  ]

  static flags = {
    ...DocsBaseCommand.baseFlags,
    limit: Flags.integer({ description: 'Max results to return', default: 50 }),
    site: Flags.string({ description: 'Filter by Site id' }),
    visibility: Flags.string({
      description: 'Filter by visibility',
      options: ['all', 'public', 'private'],
    }),
  }

  async run() {
    const { flags } = await this.parse(DocsCollectionListCommand)
    const items = await collectPages(
      this.docsClient.paginate(
        'collections',
        { siteId: flags.site, visibility: flags.visibility },
        'collections',
      ),
      flags.limit,
    )
    await this.outputResults(items, columns)
  }
}
