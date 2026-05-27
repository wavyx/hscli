import { describe, it, expect } from 'vitest'

describe('init hook', () => {
  it('exports a function', async () => {
    const mod = await import('../../src/hooks/init.js')
    expect(typeof mod.default).toBe('function')
  })

  it('runs without error', async () => {
    const { default: init } = await import('../../src/hooks/init.js')
    await expect(init()).resolves.toBeUndefined()
  })
})
