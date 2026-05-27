import { Args, Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { confirmAction } from '../../lib/confirm.js'

export default class ConvDeleteCommand extends BaseCommand {
  static description = 'Delete a conversation'

  static examples = [
    '<%= config.bin %> conv delete 123',
    '<%= config.bin %> conv delete 123 --yes',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    yes: Flags.boolean({
      char: 'y',
      description: 'Skip confirmation prompt',
      default: false,
    }),
  }

  static args = {
    id: Args.integer({ required: true, description: 'Conversation ID' }),
  }

  async run() {
    const { args, flags } = await this.parse(ConvDeleteCommand)

    const confirmed = await confirmAction(
      `Delete conversation #${args.id}? This cannot be undone.`,
      flags.yes,
    )

    if (!confirmed) {
      this.log('Cancelled.')
      return
    }

    await this.apiClient.del(`/v2/conversations/${args.id}`)
    this.log(`Deleted conversation #${args.id}`)
  }
}
