import { readFileSync } from 'node:fs'
import { CliError } from './errors.js'

/**
 * Resolve article text: a leading `@` reads the rest as a file path; otherwise
 * the value is returned as-is. Useful for long HTML bodies.
 * @param {string | undefined} value
 * @returns {string | undefined}
 */
export function readText(value) {
  if (value && value.startsWith('@')) {
    const path = value.slice(1)
    try {
      return readFileSync(path, 'utf8')
    } catch (err) {
      throw new CliError(`Cannot read --text file '${path}': ${err.message}`, {
        exitCode: 66,
      })
    }
  }
  return value
}

/**
 * Split a comma-separated flag into a trimmed array, or `undefined` when empty.
 * @param {string | undefined} value
 * @returns {string[] | undefined}
 */
export function csvList(value) {
  if (!value) return undefined
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
