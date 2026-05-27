import chalk from 'chalk'
import BaseCommand from '../base-command.js'
import { getProfileConfig } from '../lib/config.js'

export default class VersionCommand extends BaseCommand {
  static skipAuth = true

  static description = 'Show CLI version and environment info'

  static examples = ['<%= config.bin %> version']

  async run() {
    const apiBase =
      getProfileConfig(this.activeProfile, 'apiBase') ??
      'https://api.helpscout.net/v2'

    this.log(`${chalk.bold('hscli')} ${chalk.cyan(this.config.version)}`)
    this.log(`Node:     ${process.version}`)
    this.log(`API base: ${apiBase}`)
    this.log(`Platform: ${process.platform}-${process.arch}`)
  }
}
