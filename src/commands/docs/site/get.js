import { Args } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'

const columns = {
  id: { header: 'ID' },
  title: { header: 'Title' },
  subDomain: { header: 'Subdomain' },
  companyName: { header: 'Company' },
  hasPublicSite: { header: 'Public' },
}

export default class DocsSiteGetCommand extends DocsBaseCommand {
  static description = 'Get a Docs site by id'

  static args = {
    id: Args.string({ description: 'Site id', required: true }),
  }

  static examples = ['<%= config.bin %> docs site get <id>']

  static flags = { ...DocsBaseCommand.baseFlags }

  async run() {
    const { args } = await this.parse(DocsSiteGetCommand)
    const data = await this.docsClient.get(`sites/${args.id}`)
    await this.outputResults(data.site, columns)
  }
}
