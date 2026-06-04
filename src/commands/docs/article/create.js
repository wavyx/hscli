import { Flags } from '@oclif/core'
import DocsBaseCommand from '../../../docs-base-command.js'
import { readText, csvList } from '../../../lib/docs-input.js'

const columns = {
  id: { header: 'ID' },
  number: { header: '#' },
  name: { header: 'Name' },
  status: { header: 'Status' },
  publicUrl: { header: 'URL' },
}

export default class DocsArticleCreateCommand extends DocsBaseCommand {
  static description = 'Create a Docs article'

  static examples = [
    '<%= config.bin %> docs article create --collection <id> --name "Title" --text "<p>Body</p>"',
    '<%= config.bin %> docs article create --collection <id> --name "Title" --text @article.html --status published',
  ]

  static flags = {
    ...DocsBaseCommand.baseFlags,
    collection: Flags.string({ description: 'Collection id', required: true }),
    name: Flags.string({
      description: 'Article name (unique within the collection)',
      required: true,
    }),
    text: Flags.string({
      description: 'Article body — text/HTML, or @file',
      required: true,
    }),
    status: Flags.string({
      description: 'Article status',
      options: ['published', 'notpublished'],
      default: 'notpublished',
    }),
    slug: Flags.string({ description: 'SEO slug (auto-generated if omitted)' }),
    categories: Flags.string({ description: 'Comma-separated category ids' }),
    keywords: Flags.string({ description: 'Comma-separated keywords' }),
  }

  async run() {
    const { flags } = await this.parse(DocsArticleCreateCommand)
    const body = {
      collectionId: flags.collection,
      name: flags.name,
      text: readText(flags.text),
      status: flags.status,
      slug: flags.slug,
      categories: csvList(flags.categories),
      keywords: csvList(flags.keywords),
    }
    // reload=true returns the created article (with its new id) in the response.
    const data = await this.docsClient.post('articles', {
      query: { reload: true },
      body,
    })
    await this.outputResults(data.article, columns)
  }
}
