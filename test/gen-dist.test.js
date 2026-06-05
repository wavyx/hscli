import { describe, it, expect } from 'vitest'
import {
  renderHomebrewFormula,
  renderScoopManifest,
} from '../scripts/gen-dist.mjs'

describe('renderHomebrewFormula', () => {
  const formula = renderHomebrewFormula({
    version: '0.11.0',
    url: 'https://registry.npmjs.org/@wavyx/hscli/-/hscli-0.11.0.tgz',
    sha256: 'deadbeef',
  })

  it('pins the tarball url, sha256, and node dependency', () => {
    expect(formula).toContain('class Hscli < Formula')
    expect(formula).toContain(
      'url "https://registry.npmjs.org/@wavyx/hscli/-/hscli-0.11.0.tgz"',
    )
    expect(formula).toContain('sha256 "deadbeef"')
    expect(formula).toContain('depends_on "node"')
    expect(formula).toContain('depends_on "jq"')
    expect(formula).toContain('JQ_PATH')
    expect(formula).toContain('hscli version')
  })
})

describe('renderScoopManifest', () => {
  const manifest = JSON.parse(renderScoopManifest({ version: '0.11.0' }))

  it('installs from npm and depends on nodejs', () => {
    expect(manifest.version).toBe('0.11.0')
    expect(manifest.depends).toBe('nodejs')
    expect(manifest.installer.script.join(' ')).toContain(
      'npm install -g @wavyx/hscli@0.11.0',
    )
    expect(manifest.uninstaller.script.join(' ')).toContain('npm uninstall -g')
  })
})
