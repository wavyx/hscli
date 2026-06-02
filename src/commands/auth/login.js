import { Flags } from '@oclif/core'
import chalk from 'chalk'
import ora from 'ora'
import BaseCommand from '../../base-command.js'
import {
  resolveCredentials,
  authorizationCodeFlow,
  clientCredentialsFlow,
} from '../../lib/auth.js'
import { setTokens } from '../../lib/keychain.js'
import { setProfileConfig } from '../../lib/config.js'
import { ApiError } from '../../lib/errors.js'

export default class LoginCommand extends BaseCommand {
  static skipAuth = true

  static description = 'Authenticate with Help Scout'

  static examples = [
    '<%= config.bin %> auth login',
    '<%= config.bin %> auth login --client-credentials',
    '<%= config.bin %> auth login --app-id <id> --app-secret <secret>',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    'client-credentials': Flags.boolean({
      description: 'Use client credentials grant (no browser)',
      default: false,
    }),
    'app-id': Flags.string({
      description: 'OAuth app ID (overrides profile/env)',
      dependsOn: ['app-secret'],
    }),
    'app-secret': Flags.string({
      description: 'OAuth app secret (overrides profile/env)',
      dependsOn: ['app-id'],
    }),
  }

  async run() {
    const { flags } = await this.parse(LoginCommand)

    const { clientId, clientSecret } = resolveCredentials({
      flags: { appId: flags['app-id'], appSecret: flags['app-secret'] },
      profile: this.activeProfile,
    })

    const credentialSource = 'byo'
    const spinner = ora()

    try {
      if (flags['client-credentials']) {
        spinner.start('Authenticating with client credentials...')
        const result = await clientCredentialsFlow({ clientId, clientSecret })

        await setTokens(this.activeProfile, {
          accessToken: result.accessToken,
          refreshToken: undefined,
          expiresAt: Date.now() + result.expiresIn * 1000,
          authMode: 'client_credentials',
          credentialSource,
        })

        setProfileConfig(this.activeProfile, 'auth_mode', 'client_credentials')
        spinner.succeed(chalk.green('Authenticated with client credentials'))
      } else {
        spinner.start('Opening browser for authentication...')
        const result = await authorizationCodeFlow({ clientId, clientSecret })
        spinner.text = 'Storing credentials...'

        await setTokens(this.activeProfile, {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: Date.now() + result.expiresIn * 1000,
          authMode: 'authorization_code',
          credentialSource,
        })

        setProfileConfig(this.activeProfile, 'auth_mode', 'authorization_code')
        spinner.succeed(chalk.green('Authenticated successfully'))
      }

      this.log(`Profile: ${chalk.cyan(this.activeProfile)}`)
    } catch (error) {
      spinner.fail('Authentication failed')

      if (
        error instanceof ApiError &&
        error.statusCode === 401 &&
        JSON.stringify(error.body).includes('invalid_client')
      ) {
        this.log('')
        this.log(
          chalk.yellow(
            'Invalid client credentials. If you are using your own OAuth app,',
          ),
        )
        this.log(
          chalk.yellow(
            'run `hscli auth setup` to configure your app ID and secret.',
          ),
        )
        this.exit(77)
      }

      throw error
    }
  }
}
