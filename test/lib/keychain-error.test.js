import { describe, it, expect } from 'vitest'

// The native keyring is present but its backend errors on read (e.g. a locked
// or corrupt keychain). getTokens/getDocsKey must swallow the error and return
// null rather than crash the CLI.
vi.mock('@napi-rs/keyring', () => ({
  Entry: class {
    getPassword() {
      throw new Error('keyring backend error')
    }
    setPassword() {}
    deletePassword() {}
  },
}))

const { getTokens, getDocsKey } = await import('../../src/lib/keychain.js')

describe('keychain when the keyring errors on read', () => {
  it('getDocsKey returns null on a keyring read error', async () => {
    await expect(getDocsKey('p')).resolves.toBeNull()
  })

  it('getTokens returns null on a keyring read error', async () => {
    await expect(getTokens('p')).resolves.toBeNull()
  })
})
