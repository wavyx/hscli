import { Flags } from '@oclif/core'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import BaseCommand from '../../base-command.js'
import { buildServer } from '../../lib/mcp/server.js'
import { makeExec } from '../../lib/mcp/invoke.js'

/**
 * Build and connect an MCP server. Extracted from run() so it can be tested
 * without a real stdio transport.
 * @param {object} o
 * @param {{commands: Array, version: string}} o.config
 * @param {boolean} o.allowWrites
 * @param {Function} o.exec executor for tool calls
 * @param {(server: object) => Promise<void>} o.connect transport connector
 * @param {(msg: string) => void} [o.log] startup logger (stderr)
 */
export async function startMcpServer({
  config,
  allowWrites,
  exec,
  connect,
  log,
}) {
  // Only expose hscli's own commands as tools — never bundled oclif plugin
  // commands (plugins:*, help).
  const commands = config.commands.filter((c) => c.pluginName === config.name)
  const { server, tools } = buildServer({
    commands,
    version: config.version,
    allowWrites,
    exec,
  })
  log?.(
    `hscli MCP server ready — ${tools.length} tools` +
      (allowWrites ? ' (writes enabled)' : ' (read-only)'),
  )
  await connect(server)
  return { server, tools }
}

export default class MCPServeCommand extends BaseCommand {
  static description =
    'Run hscli as a Model Context Protocol (MCP) server over stdio'

  static skipAuth = true

  static examples = [
    '<%= config.bin %> mcp serve',
    '<%= config.bin %> mcp serve --allow-writes',
  ]

  // A long-running server has no use for the output-shaping global flags; keep
  // only --profile (which auth profile the tools run under).
  static baseFlags = { profile: BaseCommand.baseFlags.profile }

  static flags = {
    'allow-writes': Flags.boolean({
      description:
        'Expose mutating tools (create/update/delete/bulk). Off by default — read-only.',
      default: false,
    }),
  }

  async run() {
    const { flags } = await this.parse(MCPServeCommand)
    // Each tool call re-invokes this same CLI as a child process, keeping the
    // parent's stdout (the MCP stdio channel) free of command output. Forward
    // the active profile so tools run under the same account as the server.
    const exec = makeExec({
      command: process.execPath,
      args: [process.argv[1]],
      env: { HSCLI_PROFILE: this.activeProfile },
    })
    await startMcpServer({
      config: this.config,
      allowWrites: flags['allow-writes'],
      exec,
      connect: (server) => server.connect(new StdioServerTransport()),
      log: (msg) => process.stderr.write(msg + '\n'),
    })
  }
}
