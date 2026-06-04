import { Args, Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'
import { confirmAction } from '../../../lib/confirm.js'

export default class DocsArticleDeleteCommand extends DocsBaseCommand {
  static description = 'Delete a Docs article'

  static args = {
    id: Args.string({ description: 'Article id', required: true }),
  }

  static examples = [
    '<%= config.bin %> docs article delete <id>',
    '<%= config.bin %> docs article delete <id> --yes',
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
    const { args, flags } = await this.parse(DocsArticleDeleteCommand)

    const confirmed = await confirmAction(
      `Delete Docs article ${args.id}? This cannot be undone.`,
      flags.yes,
    )
    if (!confirmed) {
      this.log('Cancelled.')
      return
    }

    await this.docsClient.del(`articles/${args.id}`)
    this.log(`Deleted article ${args.id}`)
  }
}
