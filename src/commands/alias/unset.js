import { Args } from '@oclif/core'
import chalk from 'chalk'
import BaseCommand from '../../base-command.js'
import { getAlias, unsetAlias } from '../../lib/aliases.js'

export default class AliasUnsetCommand extends BaseCommand {
  static skipAuth = true

  static description = 'Remove an alias'

  static examples = ['<%= config.bin %> alias unset ll']

  static args = {
    name: Args.string({ required: true, description: 'Alias name' }),
  }

  async run() {
    const { args } = await this.parse(AliasUnsetCommand)
    if (!getAlias(args.name)) {
      this.log(chalk.yellow(`Alias not found: ${args.name}`))
      return
    }
    unsetAlias(args.name)
    this.log(chalk.green(`Alias removed: ${args.name}`))
  }
}
