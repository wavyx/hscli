import { Args, Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { embedSnippet } from '../../lib/beacon/snippets.js'

export default class BeaconEmbedCommand extends BaseCommand {
  static skipAuth = true

  static description =
    'Generate the <script> embed block to add a Beacon to your website'

  static examples = [
    '<%= config.bin %> beacon embed BEACON_ID',
    '<%= config.bin %> beacon embed BEACON_ID --color "#5b21b6" --position right',
    '<%= config.bin %> beacon embed BEACON_ID --style iconAndText --text "Help"',
  ]

  static args = {
    beaconId: Args.string({
      required: true,
      description: 'Beacon ID (from Beacon settings)',
    }),
  }

  static flags = {
    ...BaseCommand.baseFlags,
    color: Flags.string({ description: 'Hex color (e.g. #5b21b6)' }),
    position: Flags.string({
      description: 'Button position',
      options: ['left', 'right'],
    }),
    style: Flags.string({
      description: 'Button style',
      options: ['icon', 'text', 'iconAndText', 'manual'],
    }),
    text: Flags.string({ description: 'Button text (for text/iconAndText)' }),
    'icon-image': Flags.string({
      description: 'Icon variant',
      options: ['message', 'beacon', 'search', 'buoy', 'question'],
    }),
  }

  async run() {
    const { args, flags } = await this.parse(BeaconEmbedCommand)
    const snippet = embedSnippet({
      beaconId: args.beaconId,
      color: flags.color,
      position: flags.position,
      style: flags.style,
      text: flags.text,
      iconImage: flags['icon-image'],
    })
    this.log(snippet)
  }
}
