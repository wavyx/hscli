import { Args, Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'
import { collectPages } from '../../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  name: { header: 'Name' },
  collectionId: { header: 'Collection' },
  status: { header: 'Status' },
  visibility: { header: 'Visibility' },
}

export default class DocsArticleSearchCommand extends DocsBaseCommand {
  static description = 'Search Docs articles by keyword'

  static args = {
    query: Args.string({ description: 'Search query', required: true }),
  }

  static examples = [
    '<%= config.bin %> docs article search "password reset"',
    '<%= config.bin %> docs article search refund --collection <id>',
  ]

  static flags = {
    ...DocsBaseCommand.baseFlags,
    collection: Flags.string({ description: 'Filter by collection id' }),
    site: Flags.string({ description: 'Filter by site id' }),
    status: Flags.string({
      description: 'Filter by status',
      options: ['all', 'published', 'notpublished'],
    }),
    visibility: Flags.string({
      description: 'Filter by visibility',
      options: ['all', 'public', 'private'],
    }),
    limit: Flags.integer({ description: 'Max results to return', default: 50 }),
  }

  async run() {
    const { args, flags } = await this.parse(DocsArticleSearchCommand)
    const items = await collectPages(
      this.docsClient.paginate(
        'search/articles',
        {
          query: args.query,
          collectionId: flags.collection,
          siteId: flags.site,
          status: flags.status,
          visibility: flags.visibility,
        },
        'articles',
      ),
      flags.limit,
    )
    await this.outputResults(items, columns)
  }
}
