import { Flags } from '@oclif/core'
import chalk from 'chalk'
import ora from 'ora'
import open from 'open'
import { input, password } from '@inquirer/prompts'
import BaseCommand from '../../base-command.js'
import { clientCredentialsFlow } from '../../lib/auth.js'
import { setTokens } from '../../lib/keychain.js'
import { setProfileConfig } from '../../lib/config.js'

export default class SetupCommand extends BaseCommand {
  static skipAuth = true

  static description = 'Configure your own Help Scout OAuth app'

  static examples = [
    '<%= config.bin %> auth setup',
    '<%= config.bin %> auth setup --app-id <id> --app-secret <secret>',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    'app-id': Flags.string({
      description: 'OAuth app ID (skip prompt)',
      dependsOn: ['app-secret'],
    }),
    'app-secret': Flags.string({
      description: 'OAuth app secret (skip prompt)',
      dependsOn: ['app-id'],
    }),
  }

  async run() {
    const { flags } = await this.parse(SetupCommand)

    let appId = flags['app-id']
    let appSecret = flags['app-secret']

    if (!appId || !appSecret) {
      this.log('')
      this.log(chalk.bold('Help Scout OAuth App Setup'))
      this.log('')
      this.log(
        'To use the CLI you need to create an OAuth application in Help Scout.',
      )
      this.log('')
      this.log('Steps:')
      this.log(`  1. Go to ${chalk.cyan('My Profile → My Apps')} in Help Scout`)
      this.log('  2. Click "Create My App"')
      this.log(
        '  3. Set the Redirection URL to: ' +
          chalk.cyan('http://127.0.0.1:9999/callback'),
      )
      this.log('  4. Copy the App ID and App Secret')
      this.log('')

      await open('https://secure.helpscout.net/members/profile/')

      appId = await input({
        message: 'App ID:',
        validate: (val) => (val.trim() ? true : 'App ID is required'),
      })

      appSecret = await password({
        message: 'App Secret:',
        validate: (val) => (val.trim() ? true : 'App Secret is required'),
      })
    }

    const spinner = ora()

    try {
      spinner.start('Validating credentials...')
      const result = await clientCredentialsFlow({
        clientId: appId,
        clientSecret: appSecret,
      })

      setProfileConfig(this.activeProfile, 'oauth_app_id', appId)

      await setTokens(this.activeProfile, {
        accessToken: result.accessToken,
        refreshToken: undefined,
        expiresAt: Date.now() + result.expiresIn * 1000,
        authMode: 'client_credentials',
        credentialSource: 'byo',
      })

      spinner.succeed(chalk.green('OAuth app configured and validated'))
      this.log('OAuth app configured and validated')
      this.log(`Profile: ${chalk.cyan(this.activeProfile)}`)
    } catch {
      spinner.fail('Validation failed')
      this.log(
        chalk.red(
          'Could not authenticate with the provided credentials. Please check your App ID and App Secret.',
        ),
      )
      this.exit(1)
    }
  }
}
