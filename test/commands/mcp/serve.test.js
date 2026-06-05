import { runCmd } from '../../helpers.js'

vi.mock('../../../src/lib/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({ activeProfile: 'default' }),
  getProfileConfig: vi.fn().mockReturnValue(undefined),
}))
// Replace the stdio transport so run() doesn't block on a real socket.
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {
    async start() {}
    async send() {}
    async close() {}
  },
}))

const { default: Cmd, startMcpServer } =
  await import('../../../src/commands/mcp/serve.js')

const config = {
  name: '@wavyx/hscli',
  version: '0.10.0',
  commands: [
    {
      id: 'conv:list',
      pluginName: '@wavyx/hscli',
      summary: 'List',
      flags: {},
      args: {},
    },
    {
      id: 'conv:delete',
      pluginName: '@wavyx/hscli',
      summary: 'Delete',
      flags: { yes: { type: 'boolean' } },
      args: { id: { required: true } },
    },
    // foreign plugin command — must be filtered out:
    {
      id: 'plugins:install',
      pluginName: '@oclif/plugin-plugins',
      summary: 'Install',
      flags: {},
      args: {},
    },
  ],
}

describe('startMcpServer', () => {
  it('builds a read-only server and connects, logging the tool count', async () => {
    const connect = vi.fn().mockResolvedValue()
    const log = vi.fn()
    const { tools } = await startMcpServer({
      config,
      allowWrites: false,
      exec: async () => ({ stdout: '[]', stderr: '', code: 0 }),
      connect,
      log,
    })
    expect(tools.map((t) => t.id)).toEqual(['conv:list'])
    expect(connect).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledWith(expect.stringContaining('read-only'))
  })

  it('builds a write-enabled server when allowWrites is set', async () => {
    const log = vi.fn()
    const { tools } = await startMcpServer({
      config,
      allowWrites: true,
      exec: async () => ({ stdout: '[]', stderr: '', code: 0 }),
      connect: vi.fn().mockResolvedValue(),
      log,
    })
    expect(tools.map((t) => t.id).sort()).toEqual(['conv:delete', 'conv:list'])
    expect(log).toHaveBeenCalledWith(expect.stringContaining('writes enabled'))
  })

  it('tolerates a missing log callback', async () => {
    await expect(
      startMcpServer({
        config,
        allowWrites: false,
        exec: async () => ({ stdout: '[]', stderr: '', code: 0 }),
        connect: vi.fn().mockResolvedValue(),
      }),
    ).resolves.toBeDefined()
  })
})

describe('mcp serve (run)', () => {
  it('parses flags and connects a stdio server', async () => {
    // Should resolve (not hang) thanks to the mocked transport.
    await expect(runCmd(Cmd, ['--allow-writes'])).resolves.toBeDefined()
  })
})
