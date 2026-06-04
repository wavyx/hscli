import { Flags } from '@oclif/core'
import { password } from '@inquirer/prompts'
import BaseCommand from '../../base-command.js'
import { createDocsClient } from '../../lib/docs-client.js'
import { setDocsKey } from '../../lib/keychain.js'
import { CliError } from '../../lib/errors.js'

export default class DocsAuthCommand extends BaseCommand {
  static description =
    'Store your Help Scout Docs API key in the OS keychain (separate from Mailbox auth)'

  static skipAuth = true

  static examples = [
    '<%= config.bin %> docs auth',
    '<%= config.bin %> docs auth --api-key <key>',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    'api-key': Flags.string({
      description: 'Docs API key (skips the interactive prompt)',
    }),
  }

  async run() {
    const { flags } = await this.parse(DocsAuthCommand)
    const apiKey =
      flags['api-key'] ||
      process.env.HSCLI_DOCS_API_KEY ||
      (await password({ message: 'Help Scout Docs API key:', mask: true }))

    if (!apiKey) {
      throw new CliError('No Docs API key provided', { exitCode: 64 })
    }

    // Validate (read-only) before persisting, so we never store a bad key.
    const client = createDocsClient({ apiKey, retry: false })
    await client.get('sites')

    await setDocsKey(this.activeProfile, apiKey)
    this.log(`✓ Docs API key stored for profile "${this.activeProfile}"`)
  }
}
