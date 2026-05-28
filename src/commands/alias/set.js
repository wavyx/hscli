import { Args } from '@oclif/core'
import chalk from 'chalk'
import BaseCommand from '../../base-command.js'
import { setAlias } from '../../lib/aliases.js'

export default class AliasSetCommand extends BaseCommand {
  static skipAuth = true

  static description = 'Create or update an alias'

  static examples = [
    '<%= config.bin %> alias set ll "conv list --limit 50"',
    '<%= config.bin %> alias set inbox "conv list --mailbox 42 --status active"',
  ]

  static args = {
    name: Args.string({ required: true, description: 'Alias name' }),
    command: Args.string({ required: true, description: 'Command to alias' }),
  }

  async run() {
    const { args } = await this.parse(AliasSetCommand)
    setAlias(args.name, args.command)
    this.log(
      chalk.green(`Alias set: ${chalk.cyan(args.name)} → ${args.command}`),
    )
  }
}
