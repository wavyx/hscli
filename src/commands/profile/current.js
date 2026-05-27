import chalk from 'chalk'
import BaseCommand from '../../base-command.js'
import { getActiveProfile } from '../../lib/config.js'

export default class ProfileCurrentCommand extends BaseCommand {
  static skipAuth = true

  static description = 'Show the active profile'

  static examples = ['<%= config.bin %> profile current']

  async run() {
    const active = getActiveProfile()
    this.log(chalk.cyan(active))
  }
}
