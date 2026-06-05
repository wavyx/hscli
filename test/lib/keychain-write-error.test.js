import { describe, it, expect } from 'vitest'

// The native keyring loads but writes fail (e.g. PermissionDenied in a
// container with no Secret Service). setTokens/setDocsKey must surface the
// friendly "keychain unavailable" CliError, not a raw backend error.
vi.mock('@napi-rs/keyring', () => ({
  Entry: class {
    getPassword() {
      return null
    }
    setPassword() {
      throw new Error('PermissionDenied')
    }
    deletePassword() {}
  },
}))

const { setTokens, setDocsKey } = await import('../../src/lib/keychain.js')

describe('keychain when the keyring errors on write', () => {
  it('setTokens surfaces a friendly keychain error (exit 78)', async () => {
    await expect(
      setTokens('p', {
        accessToken: 'x',
        expiresAt: 0,
        authMode: 'authorization_code',
        credentialSource: 'byo',
      }),
    ).rejects.toMatchObject({ exitCode: 78 })
  })

  it('setDocsKey surfaces a friendly keychain error (exit 78)', async () => {
    await expect(setDocsKey('p', 'key')).rejects.toMatchObject({ exitCode: 78 })
  })
})
