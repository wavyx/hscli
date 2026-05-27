/**
 * @param {object[]} data
 * @param {Record<string, import('./table.js').Column>} columns
 * @returns {string}
 */
export function formatCsv(data, columns) {
  if (!data || data.length === 0) return ''
  const entries = Object.entries(columns)
  const header = entries.map(([, col]) => col.header).join(',')
  const rows = data.map((row) =>
    entries
      .map(([key, col]) => {
        const val = col.get ? col.get(row) : row[col.key ?? key]
        return csvEscape(val != null ? String(val) : '')
      })
      .join(','),
  )
  return [header, ...rows].join('\n')
}

function csvEscape(val) {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"'
  }
  return val
}
