import { Args, Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'

export default class ConvAssignCommand extends BaseCommand {
  static description = 'Assign a conversation to a user'

  static examples = [
    '<%= config.bin %> conv assign 123 --user 456',
    '<%= config.bin %> conv assign 123 --user me',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    user: Flags.string({
      description: 'User ID to assign to, or "me" for the authenticated user',
      required: true,
    }),
  }

  static args = {
    id: Args.integer({ required: true, description: 'Conversation ID' }),
  }

  async run() {
    const { args, flags } = await this.parse(ConvAssignCommand)

    let userId = Number(flags.user)
    if (flags.user === 'me') {
      const me = await this.apiClient.get('/v2/users/me')
      userId = me.id
    }

    await this.apiClient.jsonPatch(`/v2/conversations/${args.id}`, [
      { op: 'replace', path: '/assignTo', value: userId },
    ])

    this.log(`Conversation #${args.id} assigned to user ${userId}`)
  }
}
