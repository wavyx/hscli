import { describe, it, expect } from 'vitest'
import { formatCsv } from '../../src/lib/output/csv.js'

const columns = {
  id: { header: 'ID' },
  name: { header: 'Name' },
}

describe('formatCsv', () => {
  it('generates header row and data rows', () => {
    const result = formatCsv(
      [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      columns,
    )
    expect(result).toBe('ID,Name\n1,Alice\n2,Bob')
  })

  it('returns empty string for empty data', () => {
    expect(formatCsv([], columns)).toBe('')
    expect(formatCsv(null, columns)).toBe('')
  })

  it('escapes values with commas', () => {
    const result = formatCsv([{ id: 1, name: 'Doe, Jane' }], columns)
    expect(result).toContain('"Doe, Jane"')
  })

  it('escapes values with double quotes', () => {
    const result = formatCsv([{ id: 1, name: 'Say "hi"' }], columns)
    expect(result).toContain('"Say ""hi"""')
  })

  it('escapes values with newlines', () => {
    const result = formatCsv([{ id: 1, name: 'line1\nline2' }], columns)
    expect(result).toContain('"line1\nline2"')
  })

  it('handles null values', () => {
    const result = formatCsv([{ id: 1, name: null }], columns)
    expect(result).toBe('ID,Name\n1,')
  })

  it('uses column.get function', () => {
    const cols = {
      email: { header: 'Email', get: (row) => row.emails?.[0] ?? '' },
    }
    const result = formatCsv([{ emails: ['a@b.com'] }], cols)
    expect(result).toBe('Email\na@b.com')
  })

  it('uses column.key when specified', () => {
    const cols = { mail: { header: 'Mail', key: 'emailAddress' } }
    const result = formatCsv([{ emailAddress: 'x@y.com' }], cols)
    expect(result).toBe('Mail\nx@y.com')
  })
})
