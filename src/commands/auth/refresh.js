import chalk from 'chalk'
import ora from 'ora'
import BaseCommand from '../../base-command.js'
import { resolveCredentials, refreshAccessToken } from '../../lib/auth.js'
import { getTokens, setTokens } from '../../lib/keychain.js'
import { CliError } from '../../lib/errors.js'

export default class RefreshCommand extends BaseCommand {
  static description = 'Force-refresh the stored access token'

  static examples = ['<%= config.bin %> auth refresh']

  static flags = {
    ...BaseCommand.baseFlags,
  }

  async run() {
    await this.parse(RefreshCommand)

    const tokens = await getTokens(this.activeProfile)
    if (!tokens?.refreshToken) {
      throw new CliError(
        'No refresh token available. Client-credentials sessions cannot be refreshed this way — run `hscli auth login` instead.',
        { exitCode: 77 },
      )
    }

    const { clientId, clientSecret } = resolveCredentials({
      profile: this.activeProfile,
    })

    const spinner = ora('Refreshing access token...').start()

    const refreshed = await refreshAccessToken({
      refreshToken: tokens.refreshToken,
      clientId,
      clientSecret,
    })

    await setTokens(this.activeProfile, {
      ...tokens,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: Date.now() + refreshed.expiresIn * 1000,
    })

    spinner.succeed(chalk.green('Token refreshed successfully'))
    this.log(`Profile: ${chalk.cyan(this.activeProfile)}`)
  }
}
