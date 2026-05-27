import { Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import BaseCommand from '../../base-command.js'
import { confirmAction } from '../../lib/confirm.js'

export default class WebhookDeleteCommand extends BaseCommand {
  static description = 'Delete a webhook'

  static examples = [
    '<%= config.bin %> webhook delete 1',
    '<%= config.bin %> webhook delete 1 --yes',
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
    id: Args.integer({ required: true, description: 'Webhook ID' }),
  }

  async run() {
    const { args, flags } = await this.parse(WebhookDeleteCommand)

    const confirmed = await confirmAction(
      `Delete webhook #${args.id}? This cannot be undone.`,
      flags.yes,
    )

    if (!confirmed) {
      this.log('Cancelled.')
      return
    }

    await this.apiClient.del(`/v2/webhooks/${args.id}`)
    this.log(chalk.green(`Deleted webhook #${args.id}`))
  }
}
