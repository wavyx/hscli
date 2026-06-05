import { CliError } from './errors.js'

/**
 * Reports return nested data with no natural columns, so `csv`/`table` would
 * silently produce empty output. Reject them with a clear message instead.
 * @param {string | undefined} output
 */
export function assertReportFormat(output) {
  if (output === 'csv' || output === 'table') {
    throw new CliError(
      `Reports are nested data; '--output ${output}' isn't supported. Use --output json or yaml (optionally with --jq).`,
      { exitCode: 64 },
    )
  }
}
