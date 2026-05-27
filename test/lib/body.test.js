import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}))

const { resolveBody } = await import('../../src/lib/body.js')

describe('resolveBody', () => {
  it('returns inline text from --body flag', async () => {
    const result = await resolveBody({ body: 'hello world' })
    expect(result).toBe('hello world')
  })

  it('reads file when --body starts with @', async () => {
    readFileSync.mockReturnValue('file contents here')
    const result = await resolveBody({ body: '@message.txt' })
    expect(readFileSync).toHaveBeenCalledWith('message.txt', 'utf8')
    expect(result).toBe('file contents here')
  })

  it('throws CliError when no body and stdin is TTY', async () => {
    const origIsTTY = process.stdin.isTTY
    process.stdin.isTTY = true
    await expect(resolveBody({})).rejects.toThrow('--body is required')
    process.stdin.isTTY = origIsTTY
  })
})
