import { Args, Flags } from '@oclif/core'
import BaseCommand from '../base-command.js'
import { resolveBody } from '../lib/body.js'

export default class ApiCommand extends BaseCommand {
  static description = 'Make a raw API request'

  static examples = [
    '<%= config.bin %> api GET /v2/conversations',
    '<%= config.bin %> api POST /v2/conversations --body \'{"subject":"test"}\'',
    '<%= config.bin %> api DELETE /v2/webhooks/1',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    body: Flags.string({
      description: 'Request body (JSON string, @file, or pipe stdin)',
    }),
    'content-type': Flags.string({
      description: 'Content-Type header',
      default: 'application/json',
    }),
  }

  static args = {
    method: Args.string({
      required: true,
      description: 'HTTP method',
      options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    }),
    path: Args.string({
      required: true,
      description: 'API path (e.g. /v2/conversations)',
    }),
  }

  async run() {
    const { args, flags } = await this.parse(ApiCommand)

    const methodMap = {
      GET: 'get',
      POST: 'post',
      PUT: 'put',
      PATCH: 'patch',
      DELETE: 'del',
    }

    const method = methodMap[args.method]
    const opts = {}

    if (flags.body && !['GET', 'DELETE'].includes(args.method)) {
      const bodyText = await resolveBody(flags)
      opts.body = JSON.parse(bodyText)
    }

    if (flags['content-type'] !== 'application/json') {
      opts.contentType = flags['content-type']
    }

    const data = await this.apiClient[method](args.path, opts)

    if (data !== null) {
      this.log(JSON.stringify(data, null, 2))
    }
  }
}
