import { describe, it, expect } from 'vitest'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import {
  buildServer,
  selectTools,
  annotationsFor,
} from '../../../src/lib/mcp/server.js'

const commands = [
  {
    id: 'conv:list',
    summary: 'List convs',
    flags: {
      status: {
        type: 'option',
        options: ['active', 'closed'],
        description: 's',
      },
    },
    args: {},
  },
  {
    id: 'docs:article:create',
    summary: 'Create article',
    flags: { name: { type: 'option', required: true } },
    args: {},
  },
  {
    id: 'conv:delete',
    summary: 'Delete conv',
    flags: { yes: { type: 'boolean' } },
    args: { id: { required: true } },
  },
]

describe('selectTools', () => {
  const cat = [{ kind: 'read' }, { kind: 'write' }, { kind: 'destructive' }]
  it('keeps only reads when writes are disallowed', () => {
    expect(selectTools(cat, { allowWrites: false })).toHaveLength(1)
  })
  it('keeps everything when writes are allowed', () => {
    expect(selectTools(cat, { allowWrites: true })).toHaveLength(3)
  })
})

describe('annotationsFor', () => {
  it('flags reads read-only and idempotent', () => {
    expect(annotationsFor({ kind: 'read', summary: 'x' })).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    })
  })
  it('flags destructive tools destructive', () => {
    expect(annotationsFor({ kind: 'destructive', summary: 'x' })).toMatchObject(
      {
        readOnlyHint: false,
        destructiveHint: true,
      },
    )
  })
  it('flags writes as neither read-only nor destructive nor idempotent', () => {
    expect(annotationsFor({ kind: 'write', summary: 'x' })).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    })
  })
})

async function connect({ allowWrites, exec }) {
  const { server } = buildServer({
    commands,
    version: '0.10.0',
    allowWrites,
    exec,
  })
  const [clientT, serverT] = InMemoryTransport.createLinkedPair()
  await server.connect(serverT)
  const client = new Client({ name: 'test', version: '1.0.0' })
  await client.connect(clientT)
  return client
}

describe('buildServer', () => {
  it('exposes only read tools when writes are disallowed', async () => {
    const client = await connect({
      allowWrites: false,
      exec: async () => ({ stdout: '[]', stderr: '', code: 0 }),
    })
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name)).toEqual(['conv_list'])
    await client.close()
  })

  it('exposes writes + destructive tools (with hints) when allowed', async () => {
    const client = await connect({
      allowWrites: true,
      exec: async () => ({ stdout: '[]', stderr: '', code: 0 }),
    })
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(
      ['conv_delete', 'conv_list', 'docs_article_create'].sort(),
    )
    const del = tools.find((t) => t.name === 'conv_delete')
    expect(del.annotations.destructiveHint).toBe(true)
    expect(del.inputSchema.properties.id).toBeDefined()
    await client.close()
  })

  it('routes a tool call through exec into structuredContent', async () => {
    let seenArgv
    const exec = async (argv) => {
      seenArgv = argv
      return { stdout: '[{"id":1}]', stderr: '', code: 0 }
    }
    const client = await connect({ allowWrites: false, exec })
    const res = await client.callTool({
      name: 'conv_list',
      arguments: { status: 'active' },
    })
    expect(res.structuredContent).toEqual({ results: [{ id: 1 }] })
    expect(seenArgv).toContain('--status')
    await client.close()
  })
})
