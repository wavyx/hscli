import { Args } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'

const columns = {
  id: { header: 'ID' },
  number: { header: '#' },
  name: { header: 'Name' },
  status: { header: 'Status' },
  popularity: { header: 'Popularity' },
  publicUrl: { header: 'URL' },
}

export default class DocsArticleGetCommand extends DocsBaseCommand {
  static description = 'Get a Docs article by id or number'

  static args = {
    id: Args.string({ description: 'Article id or number', required: true }),
  }

  static examples = [
    '<%= config.bin %> docs article get <id>',
    '<%= config.bin %> docs article get <id> --output json',
  ]

  static flags = { ...DocsBaseCommand.baseFlags }

  async run() {
    const { args } = await this.parse(DocsArticleGetCommand)
    const data = await this.docsClient.get(`articles/${args.id}`)
    await this.outputResults(data.article, columns)
  }
}
