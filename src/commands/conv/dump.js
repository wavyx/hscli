import { writeFileSync } from 'node:fs'
import { Args, Flags } from '@oclif/core'
import BaseCommand from '../../base-command.js'

export default class ConvDumpCommand extends BaseCommand {
  static description =
    'Dump a single conversation with threads, customers, tags, and attachment metadata'

  static examples = [
    '<%= config.bin %> conv dump 123 > conv-123.json',
    '<%= config.bin %> conv dump 123 --out conv-123.json',
  ]

  static args = {
    id: Args.integer({ required: true, description: 'Conversation ID' }),
  }

  static flags = {
    ...BaseCommand.baseFlags,
    out: Flags.string({
      description: 'Write JSON dump to file instead of stdout',
    }),
  }

  async run() {
    const { args, flags } = await this.parse(ConvDumpCommand)

    const conv = await this.apiClient.get(`/v2/conversations/${args.id}`, {
      query: { embed: 'threads' },
    })

    const threads = conv?._embedded?.threads ?? []
    const tags = conv?.tags ?? []
    const customers = conv?.primaryCustomer
      ? [conv.primaryCustomer]
      : conv?.createdBy?.type === 'customer'
        ? [conv.createdBy]
        : []

    const attachments = threads.flatMap((t) =>
      (t.attachments || []).map((a) => ({
        threadId: t.id,
        id: a.id,
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size,
        url: a._links?.data?.href,
      })),
    )

    const { _embedded, ...convClean } = conv
    void _embedded

    const dump = {
      conversation: convClean,
      threads,
      customers,
      tags,
      attachments,
      exportedAt: new Date().toISOString(),
      hscliVersion: this.config.version,
    }

    const json = JSON.stringify(dump, null, 2)

    if (flags.out) {
      writeFileSync(flags.out, json)
      process.stderr.write(`Wrote ${flags.out}\n`)
    } else {
      this.log(json)
    }
  }
}
