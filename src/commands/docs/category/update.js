import { Args, Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'

const columns = {
  id: { header: 'ID' },
  number: { header: '#' },
  name: { header: 'Name' },
  articleCount: { header: 'Articles' },
  order: { header: 'Order' },
}

export default class DocsCategoryUpdateCommand extends DocsBaseCommand {
  static description = 'Update a Docs category'

  static args = {
    id: Args.string({ description: 'Category id', required: true }),
  }

  static examples = [
    '<%= config.bin %> docs category update <id> --name "Renamed"',
    '<%= config.bin %> docs category update <id> --name "Billing" --order 2',
  ]

  static flags = {
    ...DocsBaseCommand.baseFlags,
    name: Flags.string({
      description: 'Category name (required by the Docs API on update)',
      required: true,
    }),
    visibility: Flags.string({
      description: 'Visibility',
      options: ['public', 'private'],
    }),
    order: Flags.integer({ description: 'Display order' }),
  }

  async run() {
    const { args, flags } = await this.parse(DocsCategoryUpdateCommand)
    const data = await this.docsClient.put(`categories/${args.id}`, {
      query: { reload: true },
      body: {
        name: flags.name,
        visibility: flags.visibility,
        order: flags.order,
      },
    })
    if (data?.category) {
      await this.outputResults(data.category, columns)
    } else {
      this.log(`Updated category ${args.id}`)
    }
  }
}
