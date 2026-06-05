import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { buildCatalog } from './catalog.js'
import { buildInputSchema } from './schema.js'
import { runTool } from './invoke.js'

/** MCP tool annotations derived from a catalog entry's kind. */
export function annotationsFor(entry) {
  return {
    title: entry.summary,
    readOnlyHint: entry.kind === 'read',
    destructiveHint: entry.kind === 'destructive',
    idempotentHint: false,
    openWorldHint: true,
  }
}

/** Filter the catalog by the write gate: reads always, writes only when allowed. */
export function selectTools(catalog, { allowWrites }) {
  return catalog.filter((e) => allowWrites || e.kind === 'read')
}

/**
 * Build an McpServer that exposes hscli commands as tools.
 * @param {object} options
 * @param {Array} options.commands oclif command descriptors
 * @param {string} options.version server version
 * @param {boolean} options.allowWrites expose mutating tools
 * @param {Function} options.exec executor passed to runTool
 * @returns {{server: McpServer, tools: Array}}
 */
export function buildServer({ commands, version, allowWrites, exec }) {
  const server = new McpServer({ name: 'hscli', version })
  const tools = selectTools(buildCatalog(commands), { allowWrites })

  for (const entry of tools) {
    server.registerTool(
      entry.toolName,
      {
        title: entry.summary,
        description: entry.summary,
        inputSchema: buildInputSchema(entry),
        annotations: annotationsFor(entry),
      },
      (input) => runTool(entry, input, exec),
    )
  }

  return { server, tools }
}
