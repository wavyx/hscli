import { formatTable } from './table.js'
import { formatJson } from './json.js'

/**
 * @param {object | object[]} data
 * @param {import('./table.js').Column} columns
 * @param {'table' | 'json'} format
 * @param {import('@oclif/core').Command} cmd
 */
export function formatOutput(data, columns, format, cmd) {
  const items = Array.isArray(data) ? data : [data]

  switch (format) {
    case 'json':
      cmd.log(formatJson(data))
      break
    case 'table':
    default:
      cmd.log(formatTable(items, columns))
      break
  }
}
