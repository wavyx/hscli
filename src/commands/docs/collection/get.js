import { Args } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'

const columns = {
  id: { header: 'ID' },
  number: { header: '#' },
  name: { header: 'Name' },
  visibility: { header: 'Visibility' },
  articleCount: { header: 'Articles' },
  publicUrl: { header: 'URL' },
}

export default class DocsCollectionGetCommand extends DocsBaseCommand {
  static description = 'Get a Docs collection by id or number'

  static args = {
    id: Args.string({ description: 'Collection id or number', required: true }),
  }

  static examples = ['<%= config.bin %> docs collection get <id>']

  static flags = { ...DocsBaseCommand.baseFlags }

  async run() {
    const { args } = await this.parse(DocsCollectionGetCommand)
    const data = await this.docsClient.get(`collections/${args.id}`)
    await this.outputResults(data.collection, columns)
  }
}
