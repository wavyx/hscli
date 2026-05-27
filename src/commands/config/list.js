import chalk from 'chalk'
import BaseCommand from '../../base-command.js'
import { getProfileData } from '../../lib/config.js'

export default class ConfigListCommand extends BaseCommand {
  static skipAuth = true

  static description = 'List all config for the active profile'

  static examples = ['<%= config.bin %> config list']

  async run() {
    const data = getProfileData(this.activeProfile)
    const entries = Object.entries(data)

    if (entries.length === 0) {
      this.log(`No config set for profile ${chalk.cyan(this.activeProfile)}`)
      return
    }

    for (const [key, value] of entries) {
      this.log(`${key}=${value}`)
    }
  }
}
