import { Args, Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { resolveBody } from '../../lib/body.js'

export default class ConvReplyCommand extends BaseCommand {
  static description = 'Reply to a conversation'

  static examples = [
    '<%= config.bin %> conv reply 123 --body "Thanks for reaching out"',
    '<%= config.bin %> conv reply 123 --body @reply.txt --cc "manager@example.com"',
    '<%= config.bin %> conv reply 123 --body "Draft reply" --draft',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    body: Flags.string({
      description: 'Reply body (text, @file, or pipe stdin)',
    }),
    cc: Flags.string({ description: 'Comma-separated CC recipients' }),
    bcc: Flags.string({ description: 'Comma-separated BCC recipients' }),
    draft: Flags.boolean({ description: 'Save as draft', default: false }),
  }

  static args = {
    id: Args.integer({ required: true, description: 'Conversation ID' }),
  }

  async run() {
    const { args, flags } = await this.parse(ConvReplyCommand)
    const text = await resolveBody(flags)
    const conv = await this.apiClient.get(`/v2/conversations/${args.id}`)

    const payload = {
      type: 'reply',
      text,
      customer: { id: conv.primaryCustomer?.id || conv.createdBy?.id },
      draft: flags.draft,
    }

    if (flags.cc) {
      payload.cc = flags.cc.split(',').map((e) => e.trim())
    }

    if (flags.bcc) {
      payload.bcc = flags.bcc.split(',').map((e) => e.trim())
    }

    await this.apiClient.post(`/v2/conversations/${args.id}/reply`, {
      body: payload,
    })
    this.log(`Replied to conversation #${args.id}`)
  }
}
