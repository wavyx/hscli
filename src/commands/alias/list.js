import BaseCommand from '../../base-command.js'
import { getAliases } from '../../lib/aliases.js'

const columns = {
  name: { header: 'Alias' },
  command: { header: 'Command' },
}

export default class AliasListCommand extends BaseCommand {
  static skipAuth = true

  static description = 'List all configured aliases'

  static examples = ['<%= config.bin %> alias list']

  async run() {
    const aliases = getAliases()
    const entries = Object.entries(aliases).map(([name, command]) => ({
      name,
      command,
    }))

    if (entries.length === 0) {
      this.log('No aliases configured.')
      this.log('Create one: hscli alias set <name> "<command>"')
      return
    }

    await this.outputResults(entries, columns)
  }
}
