import { describe, it, expect } from 'vitest'
import { assertReportFormat } from '../../src/lib/report-format.js'

describe('assertReportFormat', () => {
  it('allows structured formats', () => {
    expect(() => assertReportFormat('json')).not.toThrow()
    expect(() => assertReportFormat('yaml')).not.toThrow()
    expect(() => assertReportFormat(undefined)).not.toThrow()
  })

  it('rejects csv and table with a clear message', () => {
    expect(() => assertReportFormat('csv')).toThrow(/isn't supported/)
    expect(() => assertReportFormat('table')).toThrow(/Use --output json/)
  })
})
