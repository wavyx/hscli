import { describe, it, expect, vi } from 'vitest'

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
}))

const { confirm: mockConfirm } = await import('@inquirer/prompts')
const { confirmAction } = await import('../../src/lib/confirm.js')

describe('confirmAction', () => {
  it('returns true when skipConfirm is true', async () => {
    const result = await confirmAction('Delete?', true)
    expect(result).toBe(true)
    expect(mockConfirm).not.toHaveBeenCalled()
  })

  it('prompts user when skipConfirm is false', async () => {
    mockConfirm.mockResolvedValue(true)
    const result = await confirmAction('Delete?', false)
    expect(result).toBe(true)
    expect(mockConfirm).toHaveBeenCalledWith({ message: 'Delete?' })
  })

  it('returns false when user declines', async () => {
    mockConfirm.mockResolvedValue(false)
    const result = await confirmAction('Delete?', false)
    expect(result).toBe(false)
  })
})
