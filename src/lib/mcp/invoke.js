import { spawn } from 'node:child_process'

/**
 * Turn a validated tool input into an argv for the hscli CLI. Positional args
 * first (in definition order), then flags, then a forced `--output json`. For
 * commands that support `--yes`, it is appended so confirm prompts never block
 * (there is no TTY in MCP stdio mode).
 * @param {{id: string, args?: object, flags?: object}} entry
 * @param {Record<string, unknown>} input
 * @returns {string[]}
 */
export function toArgv(entry, input) {
  const argv = entry.id.split(':')

  for (const name of Object.keys(entry.args || {})) {
    const v = input[name]
    if (v !== undefined && v !== null) argv.push(String(v))
  }

  for (const [name, flag] of Object.entries(entry.flags || {})) {
    if (name === 'yes') continue // forced below
    const v = input[name]
    if (v === undefined || v === null) continue
    if (flag.type === 'boolean') {
      if (v) argv.push(`--${name}`)
    } else if (Array.isArray(v)) {
      for (const item of v) argv.push(`--${name}`, String(item))
    } else {
      argv.push(`--${name}`, String(v))
    }
  }

  argv.push('--output', 'json')
  if (entry.flags && 'yes' in entry.flags) argv.push('--yes')
  return argv
}

function wrap(data) {
  if (Array.isArray(data)) return { results: data }
  if (data && typeof data === 'object') return data
  return { value: data }
}

/**
 * Run a tool by executing the underlying command and shaping its output into an
 * MCP tool result.
 * @param {object} entry catalog entry
 * @param {Record<string, unknown>} input
 * @param {(argv: string[]) => Promise<{stdout: string, stderr: string, code: number}>} exec
 */
export async function runTool(entry, input, exec) {
  const argv = toArgv(entry, input)
  const { stdout, stderr, code } = await exec(argv)

  if (code !== 0) {
    return {
      content: [
        { type: 'text', text: (stderr || stdout || `exited ${code}`).trim() },
      ],
      isError: true,
    }
  }

  const text = stdout.trim()
  const result = { content: [{ type: 'text', text: text || 'OK' }] }
  try {
    result.structuredContent = wrap(JSON.parse(text))
  } catch {
    // Plain-text output (e.g. "Deleted article 5") — no structured content.
  }
  return result
}

/**
 * Build an executor that spawns the hscli CLI as a child process. Keeping
 * command output in a child process keeps the parent's stdout (the MCP stdio
 * channel) clean.
 * @param {{command: string, args?: string[]}} options
 */
/** A process killed by a signal reports a null exit code; treat that as 0. */
export function normalizeExit(code) {
  return code ?? 0
}

/** Best-effort string for a spawn error. */
export function errMessage(e) {
  return String(e?.message || e)
}

export function makeExec({ command, args = [] }) {
  return (argv) =>
    new Promise((resolve) => {
      const child = spawn(command, [...args, ...argv], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (d) => (stdout += d))
      child.stderr.on('data', (d) => (stderr += d))
      child.on('error', (e) =>
        resolve({ stdout: '', stderr: errMessage(e), code: 1 }),
      )
      child.on('close', (code) =>
        resolve({ stdout, stderr, code: normalizeExit(code) }),
      )
    })
}
