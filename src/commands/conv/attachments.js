import { Args } from '@oclif/core'
import BaseCommand from '../../base-command.js'

const columns = {
  id: { header: 'ID' },
  filename: { header: 'Filename' },
  mimeType: { header: 'MIME Type' },
  size: { header: 'Size' },
  width: { header: 'Width' },
  height: { header: 'Height' },
}

export default class ConvAttachmentsCommand extends BaseCommand {
  static description = 'List attachments for a conversation'

  static examples = [
    '<%= config.bin %> conv attachments 123',
    '<%= config.bin %> conv attachments 123 --output json',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
  }

  static args = {
    id: Args.integer({ required: true, description: 'Conversation ID' }),
  }

  async run() {
    const { args } = await this.parse(ConvAttachmentsCommand)
    const data = await this.apiClient.get(
      `/v2/conversations/${args.id}/threads`,
    )
    const threads = data?._embedded?.threads ?? []

    const attachments = []
    for (const thread of threads) {
      const embedded = thread._embedded?.attachments ?? []
      const direct = thread.attachments ?? []
      const all = embedded.length > 0 ? embedded : direct
      for (const att of all) {
        attachments.push(att)
      }
    }

    await this.outputResults(attachments, columns)
  }
}
