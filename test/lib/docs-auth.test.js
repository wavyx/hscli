import { describe, it, expect, afterEach } from 'vitest'
import { resolveDocsKey } from '../../src/lib/docs-auth.js'
import { setDocsKey, deleteDocsKey } from '../../src/lib/keychain.js'

describe('resolveDocsKey', () => {
  const ORIG = process.env.HSCLI_DOCS_API_KEY
  afterEach(() => {
    if (ORIG === undefined) delete process.env.HSCLI_DOCS_API_KEY
    else process.env.HSCLI_DOCS_API_KEY = ORIG
  })

  it('prefers the flag over env and keychain', async () => {
    process.env.HSCLI_DOCS_API_KEY = 'env-key'
    const r = await resolveDocsKey({
      flags: { apiKey: 'flag-key' },
      profile: 'default',
    })
    expect(r).toEqual({ apiKey: 'flag-key', source: 'flags' })
  })

  it('falls back to the HSCLI_DOCS_API_KEY env var', async () => {
    process.env.HSCLI_DOCS_API_KEY = 'env-key'
    const r = await resolveDocsKey({ profile: 'default' })
    expect(r).toEqual({ apiKey: 'env-key', source: 'env' })
  })

  it('falls back to the keychain', async () => {
    delete process.env.HSCLI_DOCS_API_KEY
    const profile = `docs-auth-test-${Date.now()}`
    await setDocsKey(profile, 'chain-key')
    try {
      const r = await resolveDocsKey({ profile })
      expect(r).toEqual({ apiKey: 'chain-key', source: 'keychain' })
    } finally {
      await deleteDocsKey(profile)
    }
  })

  it('throws a ConfigError when nothing is configured', async () => {
    delete process.env.HSCLI_DOCS_API_KEY
    await expect(
      resolveDocsKey({ profile: `none-${Date.now()}` }),
    ).rejects.toThrow(/Docs API key/)
  })

  it('throws when called with no flags, env, or profile', async () => {
    delete process.env.HSCLI_DOCS_API_KEY
    await expect(resolveDocsKey()).rejects.toThrow(/Docs API key/)
  })
})
