import { describe, it, expect } from 'vitest'
import {
  toArgv,
  runTool,
  makeExec,
  normalizeExit,
  errMessage,
} from '../../../src/lib/mcp/invoke.js'

const readEntry = {
  id: 'conv:list',
  flags: {
    status: { type: 'option', options: ['active'] },
    embed: { type: 'option', multiple: true },
    verbose: { type: 'boolean' },
  },
  args: {},
}
const writeEntry = {
  id: 'docs:article:delete',
  flags: { yes: { type: 'boolean' } },
  args: { id: { required: true } },
}

describe('toArgv', () => {
  it('splits the id into a command path and forces --output=json', () => {
    const argv = toArgv(readEntry, { status: 'active' })
    expect(argv.slice(0, 2)).toEqual(['conv', 'list'])
    expect(argv).toContain('--status=active')
    expect(argv).toContain('--output=json')
  })

  it('emits flag values as --name=value so they cannot be read as flags', () => {
    // A value starting with `-` must not become a CLI flag.
    const argv = toArgv(readEntry, { status: '--help' })
    expect(argv).toContain('--status=--help')
    expect(argv).not.toContain('--help')
  })

  it('puts positional args after a -- separator', () => {
    // An arg value starting with `-` must stay a positional.
    const argv = toArgv(
      { id: 'conv:get', flags: {}, args: { id: {} } },
      {
        id: '--help',
      },
    )
    const sep = argv.indexOf('--')
    expect(sep).toBeGreaterThan(-1)
    expect(argv.slice(sep + 1)).toEqual(['--help'])
  })

  it('emits a boolean flag only when true', () => {
    expect(toArgv(readEntry, { verbose: true })).toContain('--verbose')
    expect(toArgv(readEntry, { verbose: false })).not.toContain('--verbose')
  })

  it('repeats a multiple flag per value as --name=value', () => {
    const argv = toArgv(readEntry, { embed: ['threads', 'tags'] })
    expect(argv.filter((a) => a.startsWith('--embed='))).toEqual([
      '--embed=threads',
      '--embed=tags',
    ])
  })

  it('passes positional args after -- and auto-appends --yes', () => {
    const argv = toArgv(writeEntry, { id: '5abc' })
    expect(argv).toEqual([
      'docs',
      'article',
      'delete',
      '--output=json',
      '--yes',
      '--',
      '5abc',
    ])
  })

  it('omits an optional arg that was not provided (no -- separator)', () => {
    const argv = toArgv({ id: 'conv:get', flags: {}, args: { id: {} } }, {})
    expect(argv).toEqual(['conv', 'get', '--output=json'])
  })

  it('tolerates entries with no flags/args maps', () => {
    expect(toArgv({ id: 'conv:list' }, { status: null })).toEqual([
      'conv',
      'list',
      '--output=json',
    ])
  })

  it('skips flags and args explicitly set to null', () => {
    const argv = toArgv(
      {
        id: 'conv:get',
        flags: { status: { type: 'option' } },
        args: { id: {} },
      },
      { id: null, status: null },
    )
    expect(argv).toEqual(['conv', 'get', '--output=json'])
  })
})

describe('runTool', () => {
  const fakeExec = (result) => async () => result

  it('parses a JSON object into structuredContent', async () => {
    const res = await runTool(
      readEntry,
      {},
      fakeExec({ stdout: '{"a":1}', stderr: '', code: 0 }),
    )
    expect(res.isError).toBeFalsy()
    expect(res.structuredContent).toEqual({ a: 1 })
    expect(res.content[0].text).toBe('{"a":1}')
  })

  it('wraps a JSON array under results', async () => {
    const res = await runTool(
      readEntry,
      {},
      fakeExec({ stdout: '[1,2]', stderr: '', code: 0 }),
    )
    expect(res.structuredContent).toEqual({ results: [1, 2] })
  })

  it('wraps a primitive JSON value under value', async () => {
    const res = await runTool(
      readEntry,
      {},
      fakeExec({ stdout: '42', stderr: '', code: 0 }),
    )
    expect(res.structuredContent).toEqual({ value: 42 })
  })

  it('wraps a null JSON value under value', async () => {
    const res = await runTool(
      readEntry,
      {},
      fakeExec({ stdout: 'null', stderr: '', code: 0 }),
    )
    expect(res.structuredContent).toEqual({ value: null })
  })

  it('returns plain text with no structuredContent for non-JSON output', async () => {
    const res = await runTool(
      writeEntry,
      { id: 'x' },
      fakeExec({ stdout: 'Deleted article x', stderr: '', code: 0 }),
    )
    expect(res.structuredContent).toBeUndefined()
    expect(res.content[0].text).toBe('Deleted article x')
  })

  it('falls back to OK for empty output', async () => {
    const res = await runTool(
      readEntry,
      {},
      fakeExec({ stdout: '   ', stderr: '', code: 0 }),
    )
    expect(res.content[0].text).toBe('OK')
  })

  it('marks a non-zero exit as an error using stderr', async () => {
    const res = await runTool(
      readEntry,
      {},
      fakeExec({ stdout: '', stderr: 'boom', code: 77 }),
    )
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toBe('boom')
  })

  it('uses a generic message when a failed run produced no output', async () => {
    const res = await runTool(
      readEntry,
      {},
      fakeExec({ stdout: '', stderr: '', code: 5 }),
    )
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toBe('exited 5')
  })

  it('reports a signal-terminated child as an error (not silent success)', async () => {
    const res = await runTool(
      readEntry,
      {},
      fakeExec({
        stdout: 'partial output',
        stderr: '',
        code: 0,
        signal: 'SIGKILL',
      }),
    )
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toContain('SIGKILL')
  })
})

describe('makeExec', () => {
  it('captures stdout and a zero exit', async () => {
    const exec = makeExec({
      command: process.execPath,
      args: ['-e', 'process.stdout.write("hi")'],
    })
    const r = await exec([])
    expect(r).toMatchObject({ stdout: 'hi', code: 0 })
  })

  it('captures stderr and a non-zero exit', async () => {
    const exec = makeExec({
      command: process.execPath,
      args: ['-e', 'process.stderr.write("err");process.exit(3)'],
    })
    const r = await exec([])
    expect(r.stderr).toBe('err')
    expect(r.code).toBe(3)
  })

  it('resolves with code 1 when the process cannot be spawned', async () => {
    const exec = makeExec({
      command: 'definitely-not-a-real-binary-xyz',
      args: [],
    })
    const r = await exec([])
    expect(r.code).toBe(1)
    expect(r.stderr).toBeTruthy()
  })

  it('passes env through to the child', async () => {
    const exec = makeExec({
      command: process.execPath,
      args: ['-e', 'process.stdout.write(process.env.HSCLI_PROFILE||"none")'],
      env: { HSCLI_PROFILE: 'work' },
    })
    expect((await exec([])).stdout).toBe('work')
  })

  it('kills a child that exceeds the timeout', async () => {
    const exec = makeExec({
      command: process.execPath,
      args: ['-e', 'setTimeout(()=>{}, 10000)'],
      timeout: 150,
    })
    expect((await exec([])).signal).toBe('SIGKILL')
  })

  it('kills a child that exceeds maxBuffer', async () => {
    const exec = makeExec({
      command: process.execPath,
      args: [
        '-e',
        'const b="x".repeat(100000); setInterval(()=>process.stdout.write(b), 1)',
      ],
      maxBuffer: 50000,
      timeout: 5000,
    })
    expect((await exec([])).signal).toBe('output limit exceeded')
  })
})

describe('normalizeExit', () => {
  it('passes through a numeric code', () => {
    expect(normalizeExit(3)).toBe(3)
  })
  it('treats a null (signal) code as 0', () => {
    expect(normalizeExit(null)).toBe(0)
  })
})

describe('errMessage', () => {
  it('prefers the error message', () => {
    expect(errMessage(new Error('boom'))).toBe('boom')
  })
  it('falls back to the value itself', () => {
    expect(errMessage('plain')).toBe('plain')
  })
})
