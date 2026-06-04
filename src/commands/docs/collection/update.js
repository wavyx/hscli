import { Args, Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'

const columns = {
  id: { header: 'ID' },
  number: { header: '#' },
  name: { header: 'Name' },
  visibility: { header: 'Visibility' },
  articleCount: { header: 'Articles' },
}

export default class DocsCollectionUpdateCommand extends DocsBaseCommand {
  static description = 'Update a Docs collection'

  static args = {
    id: Args.string({ description: 'Collection id', required: true }),
  }

  static examples = [
    '<%= config.bin %> docs collection update <id> --name "Renamed"',
    '<%= config.bin %> docs collection update <id> --name "Guides" --visibility private',
  ]

  static flags = {
    ...DocsBaseCommand.baseFlags,
    name: Flags.string({
      description: 'Collection name (required by the Docs API on update)',
      required: true,
    }),
    visibility: Flags.string({
      description: 'Visibility',
      options: ['public', 'private'],
    }),
    order: Flags.integer({ description: 'Display order' }),
    site: Flags.string({ description: 'Move the collection to this site id' }),
  }

  async run() {
    const { args, flags } = await this.parse(DocsCollectionUpdateCommand)
    const data = await this.docsClient.put(`collections/${args.id}`, {
      query: { reload: true },
      body: {
        name: flags.name,
        visibility: flags.visibility,
        order: flags.order,
        siteId: flags.site,
      },
    })
    if (data?.collection) {
      await this.outputResults(data.collection, columns)
    } else {
      this.log(`Updated collection ${args.id}`)
    }
  }
}
