import { describe, it, expect, vi } from 'vitest'
import { Readable } from 'node:stream'
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

  it('reads from stdin when not TTY and no --body flag', async () => {
    const origStdin = process.stdin

    const mockStdin = Readable.from([Buffer.from('stdin content\n')])
    mockStdin.isTTY = false
    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      writable: true,
      configurable: true,
    })

    const result = await resolveBody({})
    expect(result).toBe('stdin content')

    Object.defineProperty(process, 'stdin', {
      value: origStdin,
      writable: true,
      configurable: true,
    })
  })
})
