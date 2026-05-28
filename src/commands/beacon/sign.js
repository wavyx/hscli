import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { signEmail } from '../../lib/beacon/hmac.js'

export default class BeaconSignCommand extends BaseCommand {
  static skipAuth = true

  static description =
    'Generate Beacon Secure Mode HMAC-SHA256 signature for an email'

  static examples = [
    '<%= config.bin %> beacon sign --email user@example.com --secret YOUR_KEY',
    '<%= config.bin %> beacon sign --email user@example.com --secret YOUR_KEY --output json',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    email: Flags.string({
      required: true,
      description: 'Customer email address to sign',
    }),
    secret: Flags.string({
      required: true,
      description: 'Beacon secret key (from Beacon settings → Contact tab)',
      env: 'HSCLI_BEACON_SECRET',
    }),
  }

  async run() {
    const { flags } = await this.parse(BeaconSignCommand)
    const signature = signEmail(flags.secret, flags.email)
    if (flags.output === 'json') {
      this.log(JSON.stringify({ email: flags.email, signature }, null, 2))
    } else {
      this.log(signature)
    }
  }
}
