import { Flags } from '@oclif/core'
import chalk from 'chalk'
import BaseCommand from '../../base-command.js'

export default class WebhookCreateCommand extends BaseCommand {
  static description = 'Create a webhook'

  static examples = [
    '<%= config.bin %> webhook create --url https://example.com/hook --event convo.created --secret s3cret',
    '<%= config.bin %> webhook create --url https://example.com/hook --event convo.created,convo.updated --secret s3cret --label "My Hook"',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    url: Flags.string({ description: 'Webhook URL', required: true }),
    event: Flags.string({
      description: 'Comma-separated event names',
      required: true,
    }),
    secret: Flags.string({ description: 'Webhook secret', required: true }),
    label: Flags.string({ description: 'Webhook label' }),
  }

  async run() {
    const { flags } = await this.parse(WebhookCreateCommand)

    const payload = {
      url: flags.url,
      events: flags.event.split(',').map((e) => e.trim()),
      secret: flags.secret,
    }

    if (flags.label) {
      payload.label = flags.label
    }

    const result = await this.apiClient.post('/v2/webhooks', { body: payload })
    this.log(chalk.green(`Created webhook ${result.id}`))
  }
}
