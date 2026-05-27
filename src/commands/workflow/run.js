import { Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import BaseCommand from '../../base-command.js'

export default class WorkflowRunCommand extends BaseCommand {
  static description = 'Run a manual workflow on conversations'

  static examples = ['<%= config.bin %> workflow run 1 --conv 100,200,300']

  static flags = {
    ...BaseCommand.baseFlags,
    conv: Flags.string({
      description: 'Comma-separated conversation IDs',
      required: true,
    }),
  }

  static args = {
    id: Args.integer({ required: true, description: 'Workflow ID' }),
  }

  async run() {
    const { args, flags } = await this.parse(WorkflowRunCommand)

    await this.apiClient.post(`/v2/workflows/${args.id}/run`, {
      body: { conversationIds: flags.conv.split(',').map(Number) },
    })
    this.log(chalk.green(`Workflow #${args.id} executed successfully`))
  }
}
