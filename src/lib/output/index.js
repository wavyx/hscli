import { formatTable } from './table.js'
import { formatJson } from './json.js'
import { formatYaml } from './yaml.js'
import { formatCsv } from './csv.js'

/**
 * @param {object | object[]} data
 * @param {Record<string, import('./table.js').Column>} columns
 * @param {'table' | 'json' | 'yaml' | 'csv'} format
 * @param {import('@oclif/core').Command} cmd
 */
export function formatOutput(data, columns, format, cmd) {
  const items = Array.isArray(data) ? data : [data]

  switch (format) {
    case 'json':
      cmd.log(formatJson(data))
      break
    case 'yaml':
      cmd.log(formatYaml(data))
      break
    case 'csv':
      cmd.log(formatCsv(items, columns))
      break
    case 'table':
    default:
      cmd.log(formatTable(items, columns))
      break
  }
}
