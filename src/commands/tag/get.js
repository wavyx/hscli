import { Args } from '@oclif/core'
import BaseCommand from '../../base-command.js'

const columns = {
  id: { header: 'ID' },
  name: { header: 'Name' },
  slug: { header: 'Slug' },
  createdAt: { header: 'Created' },
  ticketCount: { header: 'Count' },
}

export default class TagGetCommand extends BaseCommand {
  static description = 'Get a tag by ID'

  static examples = ['<%= config.bin %> tag get 123']

  static flags = {
    ...BaseCommand.baseFlags,
  }

  static args = {
    id: Args.integer({ required: true, description: 'Tag ID' }),
  }

  async run() {
    const { args } = await this.parse(TagGetCommand)
    const data = await this.apiClient.get(`/v2/tags/${args.id}`)
    await this.outputResults([data], columns)
  }
}
