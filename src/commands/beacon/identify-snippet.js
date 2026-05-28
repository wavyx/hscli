import { Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { identifySnippet, SUPPORTED_STACKS } from '../../lib/beacon/snippets.js'

export default class BeaconIdentifySnippetCommand extends BaseCommand {
  static skipAuth = true

  static description = `Generate server-side identify snippet with HMAC signing for ${SUPPORTED_STACKS.join(', ')}`

  static examples = [
    '<%= config.bin %> beacon identify-snippet --beacon-id BEACON_ID --secret KEY',
    '<%= config.bin %> beacon identify-snippet --beacon-id BEACON_ID --secret KEY --stack rails',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    'beacon-id': Flags.string({ required: true, description: 'Beacon ID' }),
    secret: Flags.string({
      required: true,
      description: 'Beacon secret key',
      env: 'HSCLI_BEACON_SECRET',
    }),
    stack: Flags.string({
      description: 'Server-side stack',
      options: SUPPORTED_STACKS,
      default: 'node',
    }),
  }

  async run() {
    const { flags } = await this.parse(BeaconIdentifySnippetCommand)
    const snippet = identifySnippet({
      beaconId: flags['beacon-id'],
      secret: flags.secret,
      stack: flags.stack,
    })
    this.log(snippet)
  }
}
