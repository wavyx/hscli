import { Args, Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'
import { confirmAction } from '../../../lib/confirm.js'

export default class DocsCategoryDeleteCommand extends DocsBaseCommand {
  static description = 'Delete a Docs category'

  static args = {
    id: Args.string({ description: 'Category id', required: true }),
  }

  static examples = [
    '<%= config.bin %> docs category delete <id>',
    '<%= config.bin %> docs category delete <id> --yes',
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
    const { args, flags } = await this.parse(DocsCategoryDeleteCommand)

    const confirmed = await confirmAction(
      `Delete Docs category ${args.id}? This cannot be undone.`,
      flags.yes,
    )
    if (!confirmed) {
      this.log('Cancelled.')
      return
    }

    await this.docsClient.del(`categories/${args.id}`)
    this.log(`Deleted category ${args.id}`)
  }
}
