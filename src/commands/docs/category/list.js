import { Args, Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'
import { collectPages } from '../../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  number: { header: '#' },
  name: { header: 'Name' },
  articleCount: { header: 'Articles' },
  order: { header: 'Order' },
}

export default class DocsCategoryListCommand extends DocsBaseCommand {
  static description = 'List categories within a Docs collection'

  static args = {
    collectionId: Args.string({
      description: 'Collection id',
      required: true,
    }),
  }

  static examples = ['<%= config.bin %> docs category list <collectionId>']

  static flags = {
    ...DocsBaseCommand.baseFlags,
    limit: Flags.integer({ description: 'Max results to return', default: 50 }),
  }

  async run() {
    const { args, flags } = await this.parse(DocsCategoryListCommand)
    const items = await collectPages(
      this.docsClient.paginate(
        `collections/${args.collectionId}/categories`,
        {},
        'categories',
      ),
      flags.limit,
    )
    await this.outputResults(items, columns)
  }
}
