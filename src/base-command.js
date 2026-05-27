import { Command, Flags } from '@oclif/core'
import { formatOutput } from './lib/output/index.js'
import { loadConfig } from './lib/config.js'
import {
  getValidToken,
  resolveCredentials,
  refreshAccessToken,
} from './lib/auth.js'
import { getTokens, setTokens } from './lib/keychain.js'
import { createClient } from './lib/client.js'
import { AuthRequiredError, handleError } from './lib/errors.js'

export default class BaseCommand extends Command {
  static baseFlags = {
    output: Flags.string({
      char: 'o',
      description: 'Output format',
      helpGroup: 'GLOBAL',
      options: ['table', 'json'],
    }),
    profile: Flags.string({
      description: 'Named auth profile to use',
      helpGroup: 'GLOBAL',
      env: 'HSCLI_PROFILE',
    }),
    'no-color': Flags.boolean({
      description: 'Disable color output',
      helpGroup: 'GLOBAL',
    }),
    verbose: Flags.boolean({
      description: 'Show detailed API request/response on errors',
      helpGroup: 'GLOBAL',
      default: false,
    }),
  }

  /** @type {string} */
  activeProfile
  /** @type {import('./lib/client.js').createClient} */
  apiClient

  async init() {
    await super.init()
    const { flags } = await this.parse(/** @type {any} */ (this.constructor))
    this.flags = flags

    if (flags['no-color'] || process.env.NO_COLOR) {
      process.env.FORCE_COLOR = '0'
    }

    if (flags.verbose) {
      process.env.DEBUG = process.env.DEBUG
        ? `${process.env.DEBUG},hs:*`
        : 'hs:*'
    }

    const config = loadConfig(flags.profile)
    this.activeProfile = config.activeProfile

    if (this.constructor.skipAuth) return

    const token = await getValidToken(this.activeProfile)
    if (!token) throw new AuthRequiredError()

    const creds = resolveCredentials({ profile: this.activeProfile })
    this.apiClient = createClient({
      accessToken: token,
      onRefresh: async () => {
        const stored = await getTokens(this.activeProfile)
        if (!stored?.refreshToken) throw new AuthRequiredError()
        const refreshed = await refreshAccessToken({
          refreshToken: stored.refreshToken,
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
        })
        await setTokens(this.activeProfile, {
          ...stored,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: Date.now() + refreshed.expiresIn * 1000,
        })
        return refreshed.accessToken
      },
    })
  }

  /**
   * @param {object | object[]} data
   * @param {Record<string, import('./lib/output/table.js').Column>} columns
   */
  outputResults(data, columns) {
    let format = this.flags.output
    if (!format) {
      if (process.stdout.isTTY) {
        format = 'table'
      } else {
        format = 'json'
      }
    }
    formatOutput(data, columns, format, this)
  }

  async catch(err) {
    handleError(err, this)
  }
}
