import { Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'

const columns = {
  id: { header: 'ID' },
  number: { header: '#' },
  name: { header: 'Name' },
  articleCount: { header: 'Articles' },
  order: { header: 'Order' },
}

export default class DocsCategoryCreateCommand extends DocsBaseCommand {
  static description = 'Create a Docs category within a collection'

  static examples = [
    '<%= config.bin %> docs category create --collection <id> --name "Billing"',
  ]

  static flags = {
    ...DocsBaseCommand.baseFlags,
    collection: Flags.string({ description: 'Collection id', required: true }),
    name: Flags.string({
      description: 'Category name (unique within the collection)',
      required: true,
    }),
    visibility: Flags.string({
      description: 'Visibility',
      options: ['public', 'private'],
    }),
    order: Flags.integer({ description: 'Display order' }),
  }

  async run() {
    const { flags } = await this.parse(DocsCategoryCreateCommand)
    const data = await this.docsClient.post('categories', {
      query: { reload: true },
      body: {
        collectionId: flags.collection,
        name: flags.name,
        visibility: flags.visibility,
        order: flags.order,
      },
    })
    await this.outputResults(data.category, columns)
  }
}
