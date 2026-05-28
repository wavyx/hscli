import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { verifyEmail } from '../../lib/beacon/hmac.js'

export default class BeaconVerifyCommand extends BaseCommand {
  static skipAuth = true

  static description =
    'Verify a Beacon Secure Mode HMAC signature (exit 0 on match, exit 1 on mismatch)'

  static examples = [
    '<%= config.bin %> beacon verify --email user@example.com --secret KEY --signature SIG',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    email: Flags.string({ required: true, description: 'Customer email' }),
    secret: Flags.string({
      required: true,
      description: 'Beacon secret key',
      env: 'HSCLI_BEACON_SECRET',
    }),
    signature: Flags.string({
      required: true,
      description: 'Signature to verify',
    }),
  }

  async run() {
    const { flags } = await this.parse(BeaconVerifyCommand)
    const ok = verifyEmail(flags.secret, flags.email, flags.signature)
    if (flags.output === 'json') {
      this.log(JSON.stringify({ email: flags.email, valid: ok }, null, 2))
    } else {
      this.log(ok ? 'valid' : 'invalid')
    }
    if (!ok) process.exitCode = 1
  }
}
