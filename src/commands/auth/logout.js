import chalk from 'chalk'
import BaseCommand from '../../base-command.js'
import { deleteTokens } from '../../lib/keychain.js'

export default class LogoutCommand extends BaseCommand {
  static skipAuth = true

  static description = 'Log out and remove stored credentials'

  static examples = ['<%= config.bin %> auth logout']

  static flags = {
    ...BaseCommand.baseFlags,
  }

  async run() {
    await this.parse(LogoutCommand)

    await deleteTokens(this.activeProfile)
    this.log(
      chalk.green(`Logged out of profile ${chalk.cyan(this.activeProfile)}`),
    )
  }
}
