import { readFileSync } from 'node:fs'

/**
 * Resolve article text: a leading `@` reads the rest as a file path; otherwise
 * the value is returned as-is. Useful for long HTML bodies.
 * @param {string | undefined} value
 * @returns {string | undefined}
 */
export function readText(value) {
  if (value && value.startsWith('@')) {
    return readFileSync(value.slice(1), 'utf8')
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
