import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import nock from 'nock'

const MANIFEST_HOST = 'https://raw.githubusercontent.com'
const MANIFEST_PATH = '/wavyx/hscli/main/manifest.json'

let tempDir

const mockGetConf = vi.fn()
vi.mock('../../src/lib/config.js', () => ({
  getConf: mockGetConf,
}))

// Dynamic import so the mock is in place before the module loads
const { checkKillSwitch } = await import('../../src/lib/kill-switch.js')

describe('kill-switch', () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hscli-ks-test-'))
    mockGetConf.mockReturnValue({ path: join(tempDir, 'config.json') })
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  })

  it('returns ok:true when manifest has no matching entries', async () => {
    nock(MANIFEST_HOST)
      .get(MANIFEST_PATH)
      .reply(200, {
        revoked_apps: ['some-other-client'],
        compromised_versions: ['0.0.0'],
      })

    const result = await checkKillSwitch({
      clientId: 'my-client',
      cliVersion: '1.0.0',
    })

    expect(result).toEqual({ ok: true })
  })

  it('returns ok:false when clientId is in revoked_apps', async () => {
    nock(MANIFEST_HOST)
      .get(MANIFEST_PATH)
      .reply(200, {
        revoked_apps: ['revoked-client'],
        compromised_versions: [],
      })

    const result = await checkKillSwitch({
      clientId: 'revoked-client',
      cliVersion: '1.0.0',
    })

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('revoked')
    expect(result.action).toBeDefined()
  })

  it('returns ok:false when cliVersion is in compromised_versions', async () => {
    nock(MANIFEST_HOST)
      .get(MANIFEST_PATH)
      .reply(200, {
        revoked_apps: [],
        compromised_versions: ['1.2.3'],
      })

    const result = await checkKillSwitch({
      clientId: 'my-client',
      cliVersion: '1.2.3',
    })

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('compromised')
    expect(result.action).toContain('npm')
  })

  it('returns ok:true when manifest fetch fails', async () => {
    nock(MANIFEST_HOST).get(MANIFEST_PATH).reply(500)

    const result = await checkKillSwitch({
      clientId: 'my-client',
      cliVersion: '1.0.0',
    })

    expect(result).toEqual({ ok: true })
  })

  it('returns ok:true when manifest fetch times out', async () => {
    nock(MANIFEST_HOST)
      .get(MANIFEST_PATH)
      .delayConnection(5000)
      .reply(200, { revoked_apps: [], compromised_versions: [] })

    const result = await checkKillSwitch({
      clientId: 'my-client',
      cliVersion: '1.0.0',
    })

    expect(result).toEqual({ ok: true })
  })

  it('succeeds even when cache directory is not writable', async () => {
    // Point config to a path inside a non-existent read-only directory
    mockGetConf.mockReturnValue({
      path: '/dev/null/impossible/path/config.json',
    })

    nock(MANIFEST_HOST)
      .get(MANIFEST_PATH)
      .reply(200, {
        revoked_apps: ['some-other-client'],
        compromised_versions: [],
      })

    const result = await checkKillSwitch({
      clientId: 'my-client',
      cliVersion: '1.0.0',
    })

    // Should still return ok even though cache write failed
    expect(result).toEqual({ ok: true })
  })

  it('uses cached manifest when cache is fresh', async () => {
    // Write a valid cache file
    const { writeFileSync, mkdirSync } = await import('node:fs')
    const { join } = await import('node:path')
    const cacheDir = tempDir
    const cachePath = join(cacheDir, 'manifest-cache.json')
    const cachedManifest = {
      revoked_apps: ['cached-revoked-client'],
      compromised_versions: [],
      _fetchedAt: Date.now(), // fresh cache
    }
    mkdirSync(cacheDir, { recursive: true })
    writeFileSync(cachePath, JSON.stringify(cachedManifest))

    // Point config so cacheDir is used
    mockGetConf.mockReturnValue({ path: join(tempDir, 'config.json') })

    // Should NOT make a network request since cache is fresh
    const scope = nock(MANIFEST_HOST)
      .get(MANIFEST_PATH)
      .reply(200, { revoked_apps: [], compromised_versions: [] })

    const result = await checkKillSwitch({
      clientId: 'cached-revoked-client',
      cliVersion: '1.0.0',
    })

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('revoked')
    // The nock scope should NOT have been called
    expect(scope.isDone()).toBe(false)
  })
})
