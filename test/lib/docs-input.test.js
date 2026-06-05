import { describe, it, expect } from 'vitest'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readText, csvList } from '../../src/lib/docs-input.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('docs-input', () => {
  it('readText returns a plain string unchanged', () => {
    expect(readText('<p>hi</p>')).toBe('<p>hi</p>')
  })

  it('readText reads a file for an @path value', () => {
    const p = join(__dirname, '../fixtures/docs-article-body.html')
    expect(readText('@' + p)).toContain('From a file')
  })

  it('readText passes through undefined', () => {
    expect(readText(undefined)).toBeUndefined()
  })

  it('readText throws a clear CliError when the @file is missing', () => {
    expect(() => readText('@/no/such/hscli-file.html')).toThrow(
      /Cannot read --text file/,
    )
  })

  it('csvList splits and trims', () => {
    expect(csvList('a, b ,c')).toEqual(['a', 'b', 'c'])
  })

  it('csvList returns undefined for empty/missing input', () => {
    expect(csvList(undefined)).toBeUndefined()
    expect(csvList('')).toBeUndefined()
  })
})
