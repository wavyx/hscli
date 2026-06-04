import { Args, Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'
import { readText } from '../../../lib/docs-input.js'
import { CliError } from '../../../lib/errors.js'

const columns = {
  id: { header: 'ID' },
  number: { header: '#' },
  name: { header: 'Name' },
  status: { header: 'Status' },
  publicUrl: { header: 'URL' },
}

export default class DocsArticleUpdateCommand extends DocsBaseCommand {
  static description = 'Update a Docs article'

  static args = {
    id: Args.string({ description: 'Article id', required: true }),
  }

  static examples = [
    '<%= config.bin %> docs article update <id> --name "New title"',
    '<%= config.bin %> docs article update <id> --text @article.html --status published',
  ]

  static flags = {
    ...DocsBaseCommand.baseFlags,
    name: Flags.string({ description: 'New article name' }),
    text: Flags.string({ description: 'New body — text/HTML, or @file' }),
    status: Flags.string({
      description: 'Article status',
      options: ['published', 'notpublished'],
    }),
    slug: Flags.string({ description: 'SEO slug' }),
  }

  async run() {
    const { args, flags } = await this.parse(DocsArticleUpdateCommand)
    const body = {}
    if (flags.name != null) body.name = flags.name
    if (flags.text != null) body.text = readText(flags.text)
    if (flags.status != null) body.status = flags.status
    if (flags.slug != null) body.slug = flags.slug

    if (Object.keys(body).length === 0) {
      throw new CliError(
        'Provide at least one field to update (--name/--text/--status/--slug)',
        { exitCode: 64 },
      )
    }

    const data = await this.docsClient.put(`articles/${args.id}`, {
      query: { reload: true },
      body,
    })
    if (data?.article) {
      await this.outputResults(data.article, columns)
    } else {
      this.log(`Updated article ${args.id}`)
    }
  }
}
