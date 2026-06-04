import { Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'
import { collectPages } from '../../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  number: { header: '#' },
  name: { header: 'Name' },
  status: { header: 'Status' },
  popularity: { header: 'Popularity' },
  lastPublishedAt: { header: 'Published' },
}

export default class DocsArticleListCommand extends DocsBaseCommand {
  static description = 'List articles in a Docs collection or category'

  static examples = [
    '<%= config.bin %> docs article list --collection <id>',
    '<%= config.bin %> docs article list --category <id> --status published',
  ]

  static flags = {
    ...DocsBaseCommand.baseFlags,
    collection: Flags.string({
      description: 'Collection id',
      exclusive: ['category'],
    }),
    category: Flags.string({
      description: 'Category id',
      exclusive: ['collection'],
    }),
    status: Flags.string({
      description: 'Filter by status',
      options: ['all', 'published', 'notpublished'],
    }),
    limit: Flags.integer({ description: 'Max results to return', default: 50 }),
  }

  async run() {
    const { flags } = await this.parse(DocsArticleListCommand)
    const path = flags.collection
      ? `collections/${flags.collection}/articles`
      : flags.category
        ? `categories/${flags.category}/articles`
        : null
    if (!path) {
      this.error('Provide --collection <id> or --category <id>', { exit: 64 })
    }
    const items = await collectPages(
      this.docsClient.paginate(path, { status: flags.status }, 'articles'),
      flags.limit,
    )
    await this.outputResults(items, columns)
  }
}
