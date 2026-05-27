import { Args } from '@oclif/core'
import BaseCommand from '../../base-command.js'
import { collectPages } from '../../lib/pagination.js'

export default class TagUsageCommand extends BaseCommand {
  static description = 'Show conversation count for a tag'

  static examples = [
    '<%= config.bin %> tag usage billing',
    '<%= config.bin %> tag usage "feature request" --output json',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
  }

  static args = {
    name: Args.string({ required: true, description: 'Tag name' }),
  }

  async run() {
    const { args, flags } = await this.parse(TagUsageCommand)

    const tags = await collectPages(
      this.apiClient.paginate('/v2/tags', {}, 'tags'),
    )

    const tag = tags.find(
      (t) => t.name.toLowerCase() === args.name.toLowerCase(),
    )

    if (!tag) {
      this.log(`Tag not found: ${args.name}`)
      return
    }

    const count = tag.ticketCount ?? 0

    if (flags.output === 'json') {
      this.log(JSON.stringify({ name: tag.name, count }))
    } else {
      this.log(`${tag.name}: ${count}`)
    }
  }
}
