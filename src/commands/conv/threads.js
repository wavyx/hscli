import { Args, Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { collectPages } from '../../lib/pagination.js'

const columns = {
  id: { header: 'ID' },
  type: { header: 'Type' },
  createdAt: { header: 'Created' },
  body: {
    header: 'Body',
    get: (row) => {
      const text = (row.body || row.text || '').replace(/<[^>]*>/g, '')
      return text.length > 80 ? text.slice(0, 77) + '...' : text
    },
  },
}

export default class ConvThreadsCommand extends BaseCommand {
  static description = 'List threads of a conversation'

  static examples = ['<%= config.bin %> conv threads 123']

  static flags = {
    ...BaseCommand.baseFlags,
  }

  static args = {
    id: Args.integer({ required: true, description: 'Conversation ID' }),
  }

  async run() {
    const { args } = await this.parse(ConvThreadsCommand)
    const data = await this.apiClient.get(
      `/v2/conversations/${args.id}/threads`,
    )
    const threads = data?._embedded?.threads ?? []
    this.outputResults(threads, columns)
  }
}
