import chalk from 'chalk'
import BaseCommand from '../../base-command.js'
import { getConf, getActiveProfile } from '../../lib/config.js'
import { isKeychainAvailable } from '../../lib/keychain.js'
import { resolveCredentials } from '../../lib/auth.js'

const PASS = chalk.green('PASS')
const FAIL = chalk.red('FAIL')

export default class ConfigValidateCommand extends BaseCommand {
  static skipAuth = true

  static description = 'Validate CLI configuration'

  static examples = ['<%= config.bin %> config validate']

  async run() {
    const { flags } = await this.parse(ConfigValidateCommand)
    const results = []

    // 1. Config directory accessible
    try {
      getConf()
      results.push({ label: 'Config directory accessible', ok: true })
    } catch {
      results.push({
        label: 'Config directory accessible',
        ok: false,
        detail: 'Cannot access config store',
      })
    }

    // 2. Active profile exists
    let profile
    try {
      profile = getActiveProfile()
      results.push({
        label: 'Active profile exists',
        ok: true,
        detail: profile,
      })
    } catch {
      results.push({
        label: 'Active profile exists',
        ok: false,
        detail: 'No active profile set',
      })
    }

    // 3. OAuth app configured (checks flags > env > profile config)
    if (profile) {
      try {
        const creds = resolveCredentials({ profile })
        results.push({
          label: 'OAuth app configured',
          ok: true,
          detail: `source: ${creds.source}`,
        })
      } catch {
        results.push({
          label: 'OAuth app configured',
          ok: false,
          detail: 'Run: hs auth setup',
        })
      }
    } else {
      results.push({
        label: 'OAuth app configured',
        ok: false,
        detail: 'No active profile',
      })
    }

    // 4. Keychain accessible
    const keychainOk = isKeychainAvailable()
    results.push({
      label: 'Keychain accessible',
      ok: keychainOk,
      detail: keychainOk
        ? undefined
        : 'OS keychain unavailable, using fallback file store',
    })

    if (flags.output === 'json') {
      const json = results.map((r) => ({
        check: r.label,
        status: r.ok ? 'pass' : 'fail',
        detail: r.detail,
      }))
      this.log(JSON.stringify(json))
      return
    }

    this.log('')
    this.log(chalk.bold('Configuration Validation'))
    this.log('')

    for (const { label, ok, detail } of results) {
      const icon = ok ? PASS : FAIL
      const suffix = detail ? chalk.dim(` (${detail})`) : ''
      this.log(`  ${icon} ${label}${suffix}`)
    }

    this.log('')

    const failed = results.filter((r) => !r.ok).length
    if (failed > 0) {
      this.log(chalk.red(`${failed} check${failed > 1 ? 's' : ''} failed`))
    } else {
      this.log(chalk.green('All checks passed'))
    }
  }
}
