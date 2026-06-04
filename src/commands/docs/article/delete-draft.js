import { Args, Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'
import { confirmAction } from '../../../lib/confirm.js'

export default class DocsArticleDeleteDraftCommand extends DocsBaseCommand {
  static description =
    'Discard the draft of a Docs article (published text is kept)'

  static args = {
    id: Args.string({ description: 'Article id', required: true }),
  }

  static examples = [
    '<%= config.bin %> docs article delete-draft <id>',
    '<%= config.bin %> docs article delete-draft <id> --yes',
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
    const { args, flags } = await this.parse(DocsArticleDeleteDraftCommand)

    const confirmed = await confirmAction(
      `Discard the draft for article ${args.id}? This cannot be undone.`,
      flags.yes,
    )
    if (!confirmed) {
      this.log('Cancelled.')
      return
    }

    await this.docsClient.del(`articles/${args.id}/drafts`)
    this.log(`Discarded draft for article ${args.id}`)
  }
}
