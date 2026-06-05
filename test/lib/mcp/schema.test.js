import { describe, it, expect } from 'vitest'
import { buildInputSchema, NOISE_FLAGS } from '../../../src/lib/mcp/schema.js'

const entry = {
  args: {
    id: { description: 'Conversation id', required: true },
    note: { description: 'Optional note' },
  },
  flags: {
    status: {
      type: 'option',
      options: ['active', 'closed'],
      description: 'St',
    },
    tag: { type: 'option', description: 'Tag', required: true },
    yes: { type: 'boolean', description: 'Skip prompt' },
    embed: { type: 'option', multiple: true, description: 'Embed' },
    // noise — must be dropped:
    output: { type: 'option', options: ['json', 'table'] },
    fields: { type: 'option' },
    'no-color': { type: 'boolean' },
    profile: { type: 'option' },
  },
}

describe('buildInputSchema', () => {
  const shape = buildInputSchema(entry)

  it('drops global/noise flags', () => {
    for (const n of ['output', 'fields', 'no-color', 'profile']) {
      expect(Object.keys(shape)).not.toContain(n)
    }
    expect(NOISE_FLAGS.has('output')).toBe(true)
  })

  it('includes args and meaningful flags', () => {
    expect(Object.keys(shape).sort()).toEqual(
      ['embed', 'id', 'note', 'status', 'tag', 'yes'].sort(),
    )
  })

  it('makes a required arg non-optional and an optional arg optional', () => {
    expect(shape.id.safeParse(undefined).success).toBe(false)
    expect(shape.note.safeParse(undefined).success).toBe(true)
    expect(shape.id.safeParse('5abc').success).toBe(true)
  })

  it('maps an options flag to an enum', () => {
    expect(shape.status.safeParse('active').success).toBe(true)
    expect(shape.status.safeParse('nope').success).toBe(false)
  })

  it('maps a plain option flag to a string and required flag stays required', () => {
    expect(shape.tag.safeParse('vip').success).toBe(true)
    expect(shape.tag.safeParse(undefined).success).toBe(false)
  })

  it('maps a boolean flag (always optional)', () => {
    expect(shape.yes.safeParse(true).success).toBe(true)
    expect(shape.yes.safeParse('x').success).toBe(false)
    expect(shape.yes.safeParse(undefined).success).toBe(true)
  })

  it('maps a multiple option flag to a string array', () => {
    expect(shape.embed.safeParse(['threads', 'tags']).success).toBe(true)
    expect(shape.embed.safeParse('threads').success).toBe(false)
  })
})

describe('buildInputSchema edge cases', () => {
  it('returns an empty shape for an entry with no args or flags', () => {
    expect(buildInputSchema({})).toEqual({})
  })

  it('handles description-less args and flags', () => {
    const shape = buildInputSchema({
      args: { x: {} },
      flags: { b: { type: 'boolean' }, o: { type: 'option' } },
    })
    expect(shape.x.safeParse(undefined).success).toBe(true)
    expect(shape.b.safeParse(true).success).toBe(true)
    expect(shape.o.safeParse('v').success).toBe(true)
  })
})
