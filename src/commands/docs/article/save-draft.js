import { Args, Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'
import { readText } from '../../../lib/docs-input.js'

export default class DocsArticleSaveDraftCommand extends DocsBaseCommand {
  static description = 'Save a draft for a Docs article (does not publish)'

  static args = {
    id: Args.string({ description: 'Article id', required: true }),
  }

  static examples = [
    '<%= config.bin %> docs article save-draft <id> --text "<p>Work in progress</p>"',
    '<%= config.bin %> docs article save-draft <id> --text @draft.html',
  ]

  static flags = {
    ...DocsBaseCommand.baseFlags,
    text: Flags.string({
      description: 'Draft body — text/HTML, or @file',
      required: true,
    }),
  }

  async run() {
    const { args, flags } = await this.parse(DocsArticleSaveDraftCommand)
    await this.docsClient.put(`articles/${args.id}/drafts`, {
      body: { text: readText(flags.text) },
    })
    this.log(`Saved draft for article ${args.id}`)
  }
}
