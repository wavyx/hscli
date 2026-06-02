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
    await this.parse(StatusCommand)

    const tokens = await getTokens(this.activeProfile)
    const keychainType = isKeychainAvailable() ? 'OS keychain' : 'unavailable'

    this.log(chalk.bold('Auth Status'))
    this.log('')
    this.log(`  Profile:    ${chalk.cyan(this.activeProfile)}`)
    this.log(`  Keychain:   ${keychainType}`)

    if (!tokens) {
      this.log(`  Status:     ${chalk.red('Not authenticated')}`)
      this.log('')
      this.log(`Run ${chalk.cyan('hscli auth login')} to authenticate.`)
      return
    }

    this.log(`  Auth mode:  ${tokens.authMode}`)
    this.log(`  Credential: ${tokens.credentialSource}`)

    const now = Date.now()
    const expiresAt = tokens.expiresAt

    if (expiresAt <= now) {
      this.log(`  Token:      ${chalk.red('Expired')}`)
    } else {
      const remaining = expiresAt - now
      const humanExpiry = formatDuration(remaining)
      this.log(
        `  Token:      ${chalk.green('Valid')} (expires in ${humanExpiry})`,
      )
    }

    // Try fetching user info if token is still valid
    if (expiresAt > now) {
      await this.#showUserInfo(tokens.accessToken)
    }
  }

  /**
   * Fetch and display the authenticated user's identity.
   * @param {string} accessToken
   */
  async #showUserInfo(accessToken) {
    try {
      const res = await fetch('https://api.helpscout.net/v2/users/me', {
        headers: { authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) return

      const data = await res.json()
      this.log('')
      this.log(chalk.bold('  Authenticated User'))

      if (data.firstName || data.lastName) {
        this.log(
          `  Name:       ${[data.firstName, data.lastName].filter(Boolean).join(' ')}`,
        )
      }

      if (data.email) {
        this.log(`  Email:      ${data.email}`)
      }
    } catch {
      // Silently ignore network errors — user info is best-effort
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
