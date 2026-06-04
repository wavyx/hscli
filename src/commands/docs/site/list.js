import { Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'
import { collectPages } from '../../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  title: { header: 'Title' },
  subDomain: { header: 'Subdomain' },
  hasPublicSite: { header: 'Public' },
  updatedAt: { header: 'Updated' },
}

export default class DocsSiteListCommand extends DocsBaseCommand {
  static description = 'List Docs sites'

  static examples = ['<%= config.bin %> docs site list']

  static flags = {
    ...DocsBaseCommand.baseFlags,
    limit: Flags.integer({ description: 'Max results to return', default: 50 }),
  }

  async run() {
    const { flags } = await this.parse(DocsSiteListCommand)
    const items = await collectPages(
      this.docsClient.paginate('sites', {}, 'sites'),
      flags.limit,
    )
    await this.outputResults(items, columns)
  }
}
