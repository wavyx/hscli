import { Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import BaseCommand from '../../base-command.js'
import { resolveBody } from '../../lib/body.js'

export default class ConvEditNoteCommand extends BaseCommand {
  static description = 'Edit a note or thread body'

  static examples = [
    '<%= config.bin %> conv edit-note 123 456 --body "Updated note"',
    '<%= config.bin %> conv edit-note 123 456 --body @updated.txt',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    body: Flags.string({
      description: 'New body text (text, @file, or pipe stdin)',
    }),
  }

  static args = {
    id: Args.integer({ required: true, description: 'Conversation ID' }),
    threadId: Args.integer({ required: true, description: 'Thread ID' }),
  }

  async run() {
    const { args, flags } = await this.parse(ConvEditNoteCommand)
    const text = await resolveBody(flags)

    await this.apiClient.jsonPatch(
      `/v2/conversations/${args.id}/threads/${args.threadId}`,
      { op: 'replace', path: '/text', value: text },
    )

    this.log(
      chalk.green(
        `Updated thread ${args.threadId} on conversation #${args.id}`,
      ),
    )
  }
}
