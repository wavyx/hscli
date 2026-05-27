import { Args, Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'

export default class ConvMoveCommand extends BaseCommand {
  static description = 'Move a conversation to another mailbox'

  static examples = ['<%= config.bin %> conv move 123 --to-mailbox 456']

  static flags = {
    ...BaseCommand.baseFlags,
    'to-mailbox': Flags.integer({
      description: 'Destination mailbox ID',
      required: true,
    }),
  }

  static args = {
    id: Args.integer({ required: true, description: 'Conversation ID' }),
  }

  async run() {
    const { args, flags } = await this.parse(ConvMoveCommand)

    await this.apiClient.jsonPatch(`/v2/conversations/${args.id}`, {
      op: 'replace',
      path: '/mailboxId',
      value: flags['to-mailbox'],
    })

    this.log(`Conversation #${args.id} moved to mailbox ${flags['to-mailbox']}`)
  }
}
