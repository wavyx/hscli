import { describe, it, expect } from 'vitest'
import { collectPages } from '../../src/lib/pagination.js'

async function* generate(items) {
  for (const item of items) yield item
}

describe('collectPages', () => {
  it('collects all items when no limit is given', async () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const result = await collectPages(generate(items))
    expect(result).toEqual(items)
  })

  it('stops at limit when limit is less than total items', async () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]
    const result = await collectPages(generate(items), 3)
    expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
  })

  it('returns empty array from empty generator', async () => {
    const result = await collectPages(generate([]))
    expect(result).toEqual([])
  })

  it('returns all items when generator has exactly limit items', async () => {
    const items = [{ id: 1 }, { id: 2 }]
    const result = await collectPages(generate(items), 2)
    expect(result).toEqual(items)
  })
})
