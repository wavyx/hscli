import { readFileSync } from 'node:fs'
import { CliError } from './errors.js'

/**
 * @param {object} flags
 * @param {string} [flags.body]
 * @returns {Promise<string>}
 */
export async function resolveBody(flags) {
  if (flags.body) {
    if (flags.body.startsWith('@')) {
      return readFileSync(flags.body.slice(1), 'utf8')
    }
    return flags.body
  }

  if (!process.stdin.isTTY) {
    const chunks = []
    for await (const chunk of process.stdin) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks).toString('utf8').trim()
  }

  throw new CliError('--body is required', { exitCode: 2 })
}
