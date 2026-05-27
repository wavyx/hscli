import { Args } from '@oclif/core'
import chalk from 'chalk'
import BaseCommand from '../../base-command.js'
import { setProfileConfig } from '../../lib/config.js'

export default class ConfigSetCommand extends BaseCommand {
  static skipAuth = true

  static description = 'Set a config value for the active profile'

  static examples = [
    '<%= config.bin %> config set apiBase https://api.helpscout.net',
    '<%= config.bin %> config set output json',
  ]

  static args = {
    key: Args.string({ required: true, description: 'Config key to set' }),
    value: Args.string({ required: true, description: 'Value to assign' }),
  }

  async run() {
    const { args } = await this.parse(ConfigSetCommand)

    setProfileConfig(this.activeProfile, args.key, args.value)
    this.log(
      `Set ${chalk.cyan(args.key)} = ${chalk.green(args.value)} for profile ${chalk.cyan(this.activeProfile)}`,
    )
  }
}
