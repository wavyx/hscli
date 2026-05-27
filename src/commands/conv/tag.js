import { Args, Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'

export default class ConvTagCommand extends BaseCommand {
  static description = 'Update tags on a conversation'

  static examples = [
    '<%= config.bin %> conv tag 123 --add billing,urgent',
    '<%= config.bin %> conv tag 123 --remove spam',
    '<%= config.bin %> conv tag 123 --add vip --remove low-priority',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    add: Flags.string({ description: 'Comma-separated tags to add' }),
    remove: Flags.string({ description: 'Comma-separated tags to remove' }),
  }

  static args = {
    id: Args.integer({ required: true, description: 'Conversation ID' }),
  }

  async run() {
    const { args, flags } = await this.parse(ConvTagCommand)

    const conv = await this.apiClient.get(`/v2/conversations/${args.id}`)
    let tags = (conv.tags || []).map((t) => (typeof t === 'string' ? t : t.tag))

    if (flags.add) {
      const toAdd = flags.add.split(',').map((t) => t.trim())
      for (const tag of toAdd) {
        if (!tags.includes(tag)) {
          tags.push(tag)
        }
      }
    }

    if (flags.remove) {
      const toRemove = flags.remove.split(',').map((t) => t.trim())
      tags = tags.filter((t) => !toRemove.includes(t))
    }

    await this.apiClient.put(`/v2/conversations/${args.id}/tags`, {
      body: { tags },
    })

    this.log(`Tags updated on conversation #${args.id}: ${tags.join(', ')}`)
  }
}
