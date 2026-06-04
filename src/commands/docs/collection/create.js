import { Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'

const columns = {
  id: { header: 'ID' },
  number: { header: '#' },
  name: { header: 'Name' },
  visibility: { header: 'Visibility' },
  articleCount: { header: 'Articles' },
}

export default class DocsCollectionCreateCommand extends DocsBaseCommand {
  static description = 'Create a Docs collection'

  static examples = [
    '<%= config.bin %> docs collection create --site <siteId> --name "Guides"',
  ]

  static flags = {
    ...DocsBaseCommand.baseFlags,
    site: Flags.string({ description: 'Site id', required: true }),
    name: Flags.string({
      description: 'Collection name (unique per account)',
      required: true,
    }),
    visibility: Flags.string({
      description: 'Visibility',
      options: ['public', 'private'],
    }),
    order: Flags.integer({ description: 'Display order' }),
  }

  async run() {
    const { flags } = await this.parse(DocsCollectionCreateCommand)
    const data = await this.docsClient.post('collections', {
      query: { reload: true },
      body: {
        siteId: flags.site,
        name: flags.name,
        visibility: flags.visibility,
        order: flags.order,
      },
    })
    await this.outputResults(data.collection, columns)
  }
}
