import { Args, Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { resolveBody } from '../../lib/body.js'

export default class ConvNoteCommand extends BaseCommand {
  static description = 'Add a note to a conversation'

  static examples = [
    '<%= config.bin %> conv note 123 --body "Internal note about this ticket"',
    '<%= config.bin %> conv note 123 --body @notes.txt',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    body: Flags.string({
      description: 'Note body (text, @file, or pipe stdin)',
    }),
  }

  static args = {
    id: Args.integer({ required: true, description: 'Conversation ID' }),
  }

  async run() {
    const { args, flags } = await this.parse(ConvNoteCommand)
    const text = await resolveBody(flags)

    await this.apiClient.post(`/v2/conversations/${args.id}/notes`, {
      body: { type: 'note', text },
    })
    this.log(`Added note to conversation #${args.id}`)
  }
}
