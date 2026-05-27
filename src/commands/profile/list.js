import chalk from 'chalk'
import BaseCommand from '../../base-command.js'
import { getAllProfiles, getActiveProfile } from '../../lib/config.js'
import { getTokens } from '../../lib/keychain.js'

export default class ProfileListCommand extends BaseCommand {
  static skipAuth = true

  static description = 'List all configured profiles'

  static examples = ['<%= config.bin %> profile list']

  async run() {
    const profiles = getAllProfiles()
    const active = getActiveProfile()
    const names = new Set(Object.keys(profiles))

    const activeTokens = await getTokens(active)
    if (activeTokens) names.add(active)

    if (names.size === 0) {
      this.log('No profiles configured. Run: hs auth login')
      return
    }

    for (const name of names) {
      const tokens = await getTokens(name)
      const status = tokens ? chalk.dim(' (authenticated)') : ''
      if (name === active) {
        this.log(chalk.green(`* ${name}`) + status)
      } else {
        this.log(`  ${name}${status}`)
      }
    }
  }
}
