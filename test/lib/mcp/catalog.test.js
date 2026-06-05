import { describe, it, expect } from 'vitest'
import {
  classifyKind,
  toolName,
  buildCatalog,
  EXCLUDED,
} from '../../../src/lib/mcp/catalog.js'

describe('classifyKind', () => {
  it.each([
    ['conv:delete', 'destructive'],
    ['docs:article:delete-draft', 'destructive'],
    ['webhook:delete', 'destructive'],
    ['conv:bulk-status', 'destructive'], // bulk ops hit many records — flag for confirm
    ['conv:status', 'write'], // can mutate via --set, so gated
    ['conv:reply', 'write'],
    ['backup', 'write'],
    ['docs:collection:create', 'write'],
    ['report:conversations', 'read'], // report topic is always read
    ['beacon:sign', 'read'], // beacon utils are pure/local
    ['conv:list', 'read'],
    ['user:me', 'read'],
    ['config:validate', 'read'],
    ['auth:status', 'read'],
    ['customer:conversations', 'read'],
  ])('classifies %s as %s', (id, kind) => {
    expect(classifyKind(id)).toBe(kind)
  })
})

describe('toolName', () => {
  it('replaces colons and dashes with underscores', () => {
    expect(toolName('conv:bulk-status')).toBe('conv_bulk_status')
    expect(toolName('docs:article:save-draft')).toBe('docs_article_save_draft')
    expect(toolName('version')).toBe('version')
  })
})

describe('buildCatalog', () => {
  const commands = [
    { id: 'conv:list', summary: 'List', flags: {}, args: {} },
    { id: 'conv:delete', description: 'Delete', flags: {}, args: {} },
    { id: 'api', summary: 'escape hatch', flags: {}, args: {} },
    { id: 'conv:watch', summary: 'watch', flags: {}, args: {} },
    { id: 'doctor', summary: 'diagnostics', flags: {}, args: {} },
    { id: 'mcp:serve', summary: 'serve', flags: {}, args: {} },
    { id: 'secret', summary: 'hidden one', hidden: true, flags: {}, args: {} },
    { id: 'version' }, // bare: no summary/description/flags/args
  ]

  it('excludes hidden, escape-hatch, streaming, diagnostic, and self commands', () => {
    const cat = buildCatalog(commands)
    expect(cat.map((t) => t.id)).toEqual([
      'conv:delete',
      'conv:list',
      'version',
    ])
    for (const id of ['api', 'conv:watch', 'doctor', 'mcp:serve']) {
      expect(EXCLUDED.has(id)).toBe(true)
    }
  })

  it('maps id, toolName, summary and kind', () => {
    const cat = buildCatalog(commands)
    const list = cat.find((t) => t.id === 'conv:list')
    expect(list).toMatchObject({
      id: 'conv:list',
      toolName: 'conv_list',
      summary: 'List',
      kind: 'read',
    })
    // falls back to description when summary is absent
    expect(cat.find((t) => t.id === 'conv:delete').summary).toBe('Delete')
  })

  it('falls back to the id for summary and defaults flags/args when absent', () => {
    const v = buildCatalog(commands).find((t) => t.id === 'version')
    expect(v.summary).toBe('version')
    expect(v.flags).toEqual({})
    expect(v.args).toEqual({})
  })
})
