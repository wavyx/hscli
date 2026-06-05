import { z } from 'zod'

/**
 * Global/output-shaping flags that are noise for an MCP tool — the server
 * forces `--output json` and runs under its own profile, so these never
 * belong in a tool's input schema.
 */
export const NOISE_FLAGS = new Set([
  'output',
  'jq',
  'fields',
  'no-color',
  'verbose',
  'no-retry',
  'timeout',
  'profile',
  'api-key',
  'help',
  // `yes` is force-injected for destructive tools (no TTY); exposing it as a
  // settable input would be inert and misleading.
  'yes',
])

function flagSchema(flag) {
  let s
  if (flag.type === 'boolean') {
    // A boolean flag is presence-based, so it is always optional.
    s = z.boolean()
    if (flag.description) s = s.describe(flag.description)
    return s.optional()
  }
  if (Array.isArray(flag.options) && flag.options.length) {
    s = z.enum(flag.options)
  } else {
    // Accept numbers too — an LLM will naturally send {limit: 50}, {id: 123}.
    // toArgv stringifies before spawning, so either form is fine.
    s = z.union([z.string(), z.number()])
  }
  if (flag.multiple) s = z.array(s)
  if (flag.description) s = s.describe(flag.description)
  return flag.required ? s : s.optional()
}

function argSchema(arg) {
  let s = z.union([z.string(), z.number()])
  if (arg.description) s = s.describe(arg.description)
  return arg.required ? s : s.optional()
}

/**
 * Build a zod raw shape (the object MCP's registerTool expects as
 * `inputSchema`) from a catalog entry's args + flags.
 * @param {{args?: object, flags?: object}} entry
 * @returns {Record<string, import('zod').ZodTypeAny>}
 */
export function buildInputSchema(entry) {
  const shape = {}
  for (const [name, arg] of Object.entries(entry.args || {})) {
    shape[name] = argSchema(arg)
  }
  for (const [name, flag] of Object.entries(entry.flags || {})) {
    if (NOISE_FLAGS.has(name)) continue
    shape[name] = flagSchema(flag)
  }
  return shape
}
