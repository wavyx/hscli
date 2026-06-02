import createDebug from 'debug'
import chalk from 'chalk'
import { getAlias } from '../lib/aliases.js'

const debug = createDebug('hs:command-not-found')

export default async function commandNotFound(options) {
  const alias = getAlias(options.id)

  if (alias) {
    debug('expanding alias %s -> %s', options.id, alias)
    const aliasArgv = alias.split(/\s+/).filter(Boolean)
    const fullArgv = [...aliasArgv, ...(options.argv ?? [])]

    let commandId = fullArgv[0]
    let restArgv = fullArgv.slice(1)

    for (let i = 1; i < fullArgv.length; i++) {
      const candidate = fullArgv.slice(0, i + 1).join(':')
      if (options.config.findCommand(candidate)) {
        commandId = candidate
        restArgv = fullArgv.slice(i + 1)
      }
    }

    try {
      await options.config.runCommand(commandId, restArgv)
      process.exit(0)
    } catch (err) {
      debug('alias execution failed: %s', err.message)
      process.exit(err.exitCode ?? 1)
    }
  }

  process.stderr.write(
    `${chalk.red('Error:')} ${chalk.yellow(options.id)} is not a hscli command.\n`,
  )
  process.stderr.write(
    `Run ${chalk.cyan('hscli help')} for a list of available commands.\n`,
  )
  process.stderr.write(
    `Run ${chalk.cyan('hscli alias list')} to see configured aliases.\n`,
  )
  process.exit(127)
}
