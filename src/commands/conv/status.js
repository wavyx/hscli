import { Args, Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'

export default class ConvStatusCommand extends BaseCommand {
  static description = 'Change conversation status'

  static examples = [
    '<%= config.bin %> conv status 123 --set closed',
    '<%= config.bin %> conv status 123 --set active',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    set: Flags.string({
      description: 'Status to set',
      required: true,
      options: ['active', 'pending', 'closed', 'spam'],
    }),
  }

  static args = {
    id: Args.integer({ required: true, description: 'Conversation ID' }),
  }

  async run() {
    const { args, flags } = await this.parse(ConvStatusCommand)

    await this.apiClient.jsonPatch(`/v2/conversations/${args.id}`, {
      op: 'replace',
      path: '/status',
      value: flags.set,
    })

    this.log(`Conversation #${args.id} status → ${flags.set}`)
  }
}
