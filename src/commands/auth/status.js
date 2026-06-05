import chalk from 'chalk'
import BaseCommand from '../../base-command.js'
import { getTokens, isKeychainAvailable } from '../../lib/keychain.js'

export default class StatusCommand extends BaseCommand {
  static skipAuth = true

  static description = 'Show current authentication status'

  static examples = ['<%= config.bin %> auth status']

  static flags = {
    ...BaseCommand.baseFlags,
  }

  async run() {
    const { flags } = await this.parse(StatusCommand)

    const tokens = await getTokens(this.activeProfile)
    const status = {
      profile: this.activeProfile,
      keychain: isKeychainAvailable() ? 'OS keychain' : 'unavailable',
      authenticated: Boolean(tokens),
    }

    if (tokens) {
      status.authMode = tokens.authMode
      status.credentialSource = tokens.credentialSource
      const now = Date.now()
      const expiresAt = tokens.expiresAt
      if (expiresAt <= now) {
        status.token = { state: 'expired', expiresAt }
      } else {
        status.token = {
          state: 'valid',
          expiresAt,
          expiresInMs: expiresAt - now,
        }
        const user = await this.#fetchUser(tokens.accessToken)
        if (user) status.user = user
      }
    }

    if (flags.output === 'json') {
      this.log(JSON.stringify(status, null, 2))
      return
    }

    this.log(chalk.bold('Auth Status'))
    this.log('')
    this.log(`  Profile:    ${chalk.cyan(status.profile)}`)
    this.log(`  Keychain:   ${status.keychain}`)

    if (!tokens) {
      this.log(`  Status:     ${chalk.red('Not authenticated')}`)
      this.log('')
      this.log(`Run ${chalk.cyan('hscli auth login')} to authenticate.`)
      return
    }

    this.log(`  Auth mode:  ${status.authMode}`)
    this.log(`  Credential: ${status.credentialSource}`)

    if (status.token.state === 'expired') {
      this.log(`  Token:      ${chalk.red('Expired')}`)
    } else {
      this.log(
        `  Token:      ${chalk.green('Valid')} (expires in ${formatDuration(status.token.expiresInMs)})`,
      )
    }

    if (status.user) {
      this.log('')
      this.log(chalk.bold('  Authenticated User'))
      if (status.user.name) this.log(`  Name:       ${status.user.name}`)
      if (status.user.email) this.log(`  Email:      ${status.user.email}`)
    }
  }

  /**
   * Fetch the authenticated user's identity (best-effort).
   * @param {string} accessToken
   * @returns {Promise<{name?: string, email?: string} | null>}
   */
  async #fetchUser(accessToken) {
    try {
      const res = await fetch('https://api.helpscout.net/v2/users/me', {
        headers: { authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) return null
      const data = await res.json()
      const user = {}
      const name = [data.firstName, data.lastName].filter(Boolean).join(' ')
      if (name) user.name = name
      if (data.email) user.email = data.email
      return user
    } catch {
      // Network errors are non-fatal — user info is best-effort.
      return null
    }
  }
}

/**
 * Format a millisecond duration into a human-readable string.
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}
