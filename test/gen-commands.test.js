import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderWebsiteMdx, renderGithubMarkdown } from '../scripts/gen-commands.mjs'

const manifest = JSON.parse(
  readFileSync(new URL('../oclif.manifest.json', import.meta.url)),
)
const ids = Object.keys(manifest.commands).filter((id) => !manifest.commands[id].hidden)
const mdx = renderWebsiteMdx(manifest, 'hscli')

describe('website command reference generator', () => {
  it('documents every (non-hidden) command in the manifest', () => {
    for (const id of ids) {
      const cmd = id.replaceAll(':', ' ')
      expect(mdx, `missing command: ${cmd}`).toContain(`\`${cmd}`)
    }
  })

  it('does not reference invented commands or flags', () => {
    for (const bad of [
      'snooze',
      'customer merge',
      '--waiting-since',
      '--incremental',
      '--device',
      '--from',
    ]) {
      expect(mdx, `should not contain "${bad}"`).not.toContain(bad)
    }
  })

  it('models report as a topic with --start/--end', () => {
    expect(mdx).toContain('`report conversations`')
    expect(mdx).toContain('`--start`')
    expect(mdx).toContain('`--end`')
  })

  it('includes the global flags and exit codes sections', () => {
    expect(mdx).toContain('Global flags')
    expect(mdx).toContain('Exit codes')
  })

  it('starts with Starlight frontmatter', () => {
    expect(mdx.startsWith('---\n')).toBe(true)
    expect(mdx).toContain('title: Command reference')
  })

  it('still renders the GitHub markdown reference', () => {
    const md = renderGithubMarkdown(manifest, 'hscli')
    expect(md).toContain('title: Commands')
    expect(md).toContain('hscli conv list')
  })
})
