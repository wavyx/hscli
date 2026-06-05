/**
 * Maps oclif commands to an MCP tool catalog, classifying each by how much it
 * can mutate so the server can gate writes behind `--allow-writes`.
 */

// Commands never exposed as MCP tools:
// - `api` is an arbitrary-request escape hatch that bypasses per-tool gating.
// - `conv:watch` is a long-running stream that doesn't fit request/response.
// - `doctor` is a local-environment diagnostic (live network probe), not useful to an agent.
// - `mcp:serve` is this server itself — exposing it would let a tool spawn another server.
// - `auth:*` / `docs:auth` manage the operator's LOCAL credentials (login opens a
//   browser + binds a port on the host); they make no sense as agent tools.
export const EXCLUDED = new Set([
  'api',
  'conv:watch',
  'doctor',
  'mcp:serve',
  'auth:login',
  'auth:logout',
  'auth:refresh',
  'auth:setup',
  'docs:auth',
])

// Commands that mutate broadly and must carry the destructive hint even though
// their leaf verb isn't delete/remove/bulk.
const DESTRUCTIVE_IDS = new Set(['workflow:run'])

// Topics whose every command is read-only.
const READ_TOPICS = new Set(['report', 'beacon'])

// Leaf verbs that never mutate remote or local state.
const READ_LEAVES = new Set([
  'list',
  'get',
  'search',
  'count',
  'version',
  'doctor',
  'current',
  'threads',
  'attachments',
  'conversations',
  'fields',
  'folders',
  'usage',
  'me',
  'validate',
  'status',
])

// Read-leaf commands that can actually mutate and must stay gated.
const WRITE_OVERRIDE = new Set(['conv:status'])

/**
 * @param {string} id oclif command id (e.g. `docs:article:delete-draft`)
 * @returns {'read'|'write'|'destructive'}
 */
export function classifyKind(id) {
  const [topic] = id.split(':')
  const leaf = id.split(':').pop()
  // delete/remove and bulk operations hit data destructively — flag them so MCP
  // clients prompt before running them.
  if (
    DESTRUCTIVE_IDS.has(id) ||
    /^(delete|remove)(-|$)/.test(leaf) ||
    leaf.startsWith('bulk')
  ) {
    return 'destructive'
  }
  if (WRITE_OVERRIDE.has(id)) return 'write'
  if (READ_TOPICS.has(topic) || READ_LEAVES.has(leaf)) return 'read'
  return 'write'
}

/** Turn a command id into a valid MCP tool name. */
export function toolName(id) {
  return id.replace(/[:-]/g, '_')
}

/**
 * Build the tool catalog from a list of oclif command descriptors.
 * @param {Array<{id: string, summary?: string, description?: string, hidden?: boolean, flags?: object, args?: object}>} commands
 */
export function buildCatalog(commands) {
  return commands
    .filter((c) => !c.hidden && !EXCLUDED.has(c.id))
    .map((c) => ({
      id: c.id,
      toolName: toolName(c.id),
      summary: c.summary || c.description || c.id,
      kind: classifyKind(c.id),
      args: c.args || {},
      flags: c.flags || {},
    }))
    .sort((a, b) => (a.id < b.id ? -1 : 1))
}
