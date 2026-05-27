import { Args } from '@oclif/core'
import chalk from 'chalk'
import BaseCommand from '../../base-command.js'
import { setActiveProfile } from '../../lib/config.js'

export default class ProfileUseCommand extends BaseCommand {
  static skipAuth = true

  static description = 'Switch the active profile'

  static examples = ['<%= config.bin %> profile use work']

  static args = {
    name: Args.string({
      required: true,
      description: 'Profile name to activate',
    }),
  }

  async run() {
    const { args } = await this.parse(ProfileUseCommand)

    setActiveProfile(args.name)
    this.log(`Switched to profile ${chalk.cyan(args.name)}`)
  }
}
