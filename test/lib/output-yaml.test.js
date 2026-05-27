import { describe, it, expect } from 'vitest'
import { formatYaml } from '../../src/lib/output/yaml.js'

describe('formatYaml', () => {
  it('formats object as YAML', () => {
    const result = formatYaml({ id: 1, name: 'Test' })
    expect(result).toContain('id: 1')
    expect(result).toContain('name: Test')
  })

  it('formats array as YAML', () => {
    const result = formatYaml([{ id: 1 }, { id: 2 }])
    expect(result).toContain('- id: 1')
    expect(result).toContain('- id: 2')
  })
})
