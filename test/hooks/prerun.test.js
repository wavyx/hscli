import { describe, it, expect } from 'vitest'

describe('prerun hook', () => {
  it('exports a function', async () => {
    const mod = await import('../../src/hooks/prerun.js')
    expect(typeof mod.default).toBe('function')
  })

  it('runs without error', async () => {
    const { default: prerun } = await import('../../src/hooks/prerun.js')
    await expect(prerun({ Command: { id: 'test' } })).resolves.toBeUndefined()
  })
})
