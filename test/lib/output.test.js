import { describe, it, expect, vi } from 'vitest'
import { formatJson } from '../../src/lib/output/json.js'
import { formatTable } from '../../src/lib/output/table.js'
import { formatOutput } from '../../src/lib/output/index.js'

describe('formatJson', () => {
  it('returns pretty-printed JSON', () => {
    const data = { id: 1, name: 'Test' }
    const result = formatJson(data)
    expect(result).toBe(JSON.stringify(data, null, 2))
  })

  it('handles arrays', () => {
    const data = [{ a: 1 }, { a: 2 }]
    const result = formatJson(data)
    expect(result).toBe(JSON.stringify(data, null, 2))
  })

  it('handles null and primitive values', () => {
    expect(formatJson(null)).toBe('null')
    expect(formatJson('hello')).toBe('"hello"')
    expect(formatJson(42)).toBe('42')
  })
})

describe('formatTable', () => {
  const columns = {
    id: { header: 'ID' },
    name: { header: 'Name' },
  }

  it('returns a string containing headers and values', () => {
    const data = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]
    const result = formatTable(data, columns)
    expect(result).toContain('ID')
    expect(result).toContain('Name')
    expect(result).toContain('1')
    expect(result).toContain('Alice')
    expect(result).toContain('2')
    expect(result).toContain('Bob')
  })

  it('returns "No results found." for empty array', () => {
    const result = formatTable([], columns)
    expect(result).toContain('No results found.')
  })

  it('returns "No results found." for null data', () => {
    const result = formatTable(null, columns)
    expect(result).toContain('No results found.')
  })

  it('uses column.key when specified', () => {
    const cols = {
      email: { header: 'Email', key: 'emailAddress' },
    }
    const data = [{ emailAddress: 'test@example.com' }]
    const result = formatTable(data, cols)
    expect(result).toContain('Email')
    expect(result).toContain('test@example.com')
  })

  it('uses column.get function when specified', () => {
    const cols = {
      fullName: {
        header: 'Full Name',
        get: (row) => `${row.first} ${row.last}`,
      },
    }
    const data = [{ first: 'Jane', last: 'Doe' }]
    const result = formatTable(data, cols)
    expect(result).toContain('Full Name')
    expect(result).toContain('Jane Doe')
  })

  it('renders empty string for null values', () => {
    const data = [{ id: 1, name: null }]
    const result = formatTable(data, columns)
    expect(result).toContain('1')
    expect(typeof result).toBe('string')
  })

  it('renders empty string when col.get returns null', () => {
    const cols = {
      val: { header: 'Val', get: () => null },
    }
    const data = [{ id: 1 }]
    const result = formatTable(data, cols)
    expect(result).toContain('Val')
  })
})

describe('formatOutput', () => {
  it('dispatches to json formatter when format is "json"', () => {
    const cmd = { log: vi.fn() }
    const data = { id: 1, name: 'Test' }
    const columns = { id: { header: 'ID' } }

    formatOutput(data, columns, 'json', cmd)

    expect(cmd.log).toHaveBeenCalledOnce()
    const output = cmd.log.mock.calls[0][0]
    expect(JSON.parse(output)).toEqual(data)
  })

  it('dispatches to table formatter when format is "table"', () => {
    const cmd = { log: vi.fn() }
    const data = [{ id: 1, name: 'Alice' }]
    const columns = {
      id: { header: 'ID' },
      name: { header: 'Name' },
    }

    formatOutput(data, columns, 'table', cmd)

    expect(cmd.log).toHaveBeenCalledOnce()
    const output = cmd.log.mock.calls[0][0]
    expect(output).toContain('ID')
    expect(output).toContain('Name')
    expect(output).toContain('Alice')
  })

  it('defaults to table format for unknown format values', () => {
    const cmd = { log: vi.fn() }
    const data = [{ id: 1 }]
    const columns = { id: { header: 'ID' } }

    formatOutput(data, columns, 'unknown', cmd)

    expect(cmd.log).toHaveBeenCalledOnce()
    const output = cmd.log.mock.calls[0][0]
    expect(output).toContain('ID')
  })

  it('wraps non-array data into array for table format', () => {
    const cmd = { log: vi.fn() }
    const data = { id: 5, name: 'Solo' }
    const columns = {
      id: { header: 'ID' },
      name: { header: 'Name' },
    }

    formatOutput(data, columns, 'table', cmd)

    expect(cmd.log).toHaveBeenCalledOnce()
    const output = cmd.log.mock.calls[0][0]
    expect(output).toContain('5')
    expect(output).toContain('Solo')
  })

  it('passes raw data (not wrapped) to json formatter', () => {
    const cmd = { log: vi.fn() }
    const data = { id: 1 }
    const columns = { id: { header: 'ID' } }

    formatOutput(data, columns, 'json', cmd)

    const output = cmd.log.mock.calls[0][0]
    expect(JSON.parse(output)).toEqual({ id: 1 })
  })

  it('dispatches to yaml formatter', () => {
    const cmd = { log: vi.fn() }
    formatOutput({ id: 1, name: 'Test' }, {}, 'yaml', cmd)
    const output = cmd.log.mock.calls[0][0]
    expect(output).toContain('id: 1')
    expect(output).toContain('name: Test')
  })

  it('dispatches to csv formatter', () => {
    const cmd = { log: vi.fn() }
    const data = [{ id: 1, name: 'Alice' }]
    const columns = { id: { header: 'ID' }, name: { header: 'Name' } }
    formatOutput(data, columns, 'csv', cmd)
    const output = cmd.log.mock.calls[0][0]
    expect(output).toContain('ID,Name')
    expect(output).toContain('1,Alice')
  })
})
