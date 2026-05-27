import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { resolveBody } from '../../lib/body.js'

export default class ConvCreateCommand extends BaseCommand {
  static description = 'Create a new conversation'

  static examples = [
    '<%= config.bin %> conv create --mailbox 1 --customer user@example.com --subject "Help needed" --body "Details here"',
    '<%= config.bin %> conv create --mailbox 1 --customer user@example.com --subject "Chat" --type chat --body @message.txt',
    '<%= config.bin %> conv create --mailbox 1 --customer user@example.com --subject "Tagged" --body "Hi" --tag billing,urgent',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    mailbox: Flags.integer({ description: 'Mailbox ID', required: true }),
    customer: Flags.string({ description: 'Customer email address', required: true }),
    subject: Flags.string({ description: 'Conversation subject', required: true }),
    body: Flags.string({ description: 'Message body (text, @file, or pipe stdin)' }),
    type: Flags.string({
      description: 'Conversation type',
      options: ['email', 'chat', 'phone'],
      default: 'email',
    }),
    tag: Flags.string({ description: 'Comma-separated tags' }),
    'assign-to': Flags.integer({ description: 'User ID to assign to' }),
  }

  async run() {
    const { flags } = await this.parse(ConvCreateCommand)
    const bodyText = await resolveBody(flags)

    const payload = {
      subject: flags.subject,
      type: flags.type,
      mailboxId: flags.mailbox,
      customer: { email: flags.customer },
      threads: [{ type: 'customer', text: bodyText }],
      status: 'active',
    }

    if (flags.tag) {
      payload.tags = flags.tag.split(',').map((t) => t.trim())
    }

    if (flags['assign-to']) {
      payload.assignTo = flags['assign-to']
    }

    const result = await this.apiClient.post('/v2/conversations', { body: payload })
    this.log(`Created conversation ${result.id}`)
  }
}
