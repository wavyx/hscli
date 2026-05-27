import chalk from 'chalk'
import ora from 'ora'
import BaseCommand from '../base-command.js'
import { getConf, getActiveProfile } from '../lib/config.js'
import { getTokens, isKeychainAvailable } from '../lib/keychain.js'

const PASS = chalk.green('✔')
const FAIL = chalk.red('✘')

export default class DoctorCommand extends BaseCommand {
  static skipAuth = true

  static description = 'Run diagnostic checks on the CLI environment'

  static examples = ['<%= config.bin %> doctor']

  async run() {
    const spinner = ora('Running diagnostics...').start()
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

    // 2. Keychain available
    const keychainOk = isKeychainAvailable()
    results.push({
      label: 'Keychain available',
      ok: keychainOk,
      detail: keychainOk
        ? undefined
        : 'OS keychain unavailable, using fallback file store',
    })

    // 3. Active profile set
    let profile
    try {
      profile = getActiveProfile()
      results.push({ label: 'Active profile set', ok: true, detail: profile })
    } catch {
      results.push({ label: 'Active profile set', ok: false })
    }

    // 4. Tokens present
    let tokens
    if (profile) {
      tokens = await getTokens(profile)
      results.push({
        label: 'Tokens present',
        ok: tokens !== null,
        detail: tokens ? undefined : 'Run: hs auth login',
      })
    } else {
      results.push({
        label: 'Tokens present',
        ok: false,
        detail: 'No active profile',
      })
    }

    // 5. Token not expired
    if (tokens) {
      const notExpired = tokens.expiresAt > Date.now()
      results.push({
        label: 'Token not expired',
        ok: notExpired,
        detail: notExpired
          ? undefined
          : 'Token expired, re-authenticate with: hs auth login',
      })
    } else {
      results.push({
        label: 'Token not expired',
        ok: false,
        detail: 'No tokens found',
      })
    }

    // 6. API reachable
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      await fetch('https://api.helpscout.net/v2', { signal: controller.signal })
      clearTimeout(timeout)
      results.push({ label: 'API reachable', ok: true })
    } catch {
      results.push({
        label: 'API reachable',
        ok: false,
        detail: 'Could not reach api.helpscout.net',
      })
    }

    spinner.stop()

    this.log('')
    this.log(chalk.bold('Help Scout CLI Diagnostics'))
    this.log('')

    for (const { label, ok, detail } of results) {
      const icon = ok ? PASS : FAIL
      const suffix = detail ? chalk.dim(` (${detail})`) : ''
      this.log(`  ${icon} ${label}${suffix}`)
    }

    this.log('')

    const failed = results.filter((r) => !r.ok).length
    if (failed > 0) {
      this.log(chalk.yellow(`${failed} check${failed > 1 ? 's' : ''} failed`))
    } else {
      this.log(chalk.green('All checks passed'))
    }
  }
}
