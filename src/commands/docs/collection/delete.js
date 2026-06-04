import { Args, Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'
import { confirmAction } from '../../../lib/confirm.js'

export default class DocsCollectionDeleteCommand extends DocsBaseCommand {
  static description = 'Delete a Docs collection'

  static args = {
    id: Args.string({ description: 'Collection id', required: true }),
  }

  static examples = [
    '<%= config.bin %> docs collection delete <id>',
    '<%= config.bin %> docs collection delete <id> --yes',
  ]

  static flags = {
    ...DocsBaseCommand.baseFlags,
    yes: Flags.boolean({
      char: 'y',
      description: 'Skip confirmation prompt',
      default: false,
    }),
  }

  async run() {
    const { args, flags } = await this.parse(DocsCollectionDeleteCommand)

    const confirmed = await confirmAction(
      `Delete Docs collection ${args.id} and all its articles? This cannot be undone.`,
      flags.yes,
    )
    if (!confirmed) {
      this.log('Cancelled.')
      return
    }

    await this.docsClient.del(`collections/${args.id}`)
    this.log(`Deleted collection ${args.id}`)
  }
}
