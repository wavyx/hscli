import { describe, it, expect } from 'vitest'

// Simulate an environment where the native OS keyring is unavailable
// (e.g. Linux without libsecret). hscli must refuse to store credentials
// rather than silently fall back to a weakly-obfuscated file.
vi.mock('@napi-rs/keyring', () => {
  throw new Error('Native module not available')
})

const { getTokens, setTokens, deleteTokens, isKeychainAvailable } =
  await import('../../src/lib/keychain.js')

const testProfile = `hscli-nokeychain-${Date.now()}`

const sampleTokens = {
  accessToken: 'fallback-access-token',
  refreshToken: 'fallback-refresh-token',
  expiresAt: Date.now() + 3600_000,
  authMode: 'authorization_code',
  credentialSource: 'byo',
}

describe('keychain when OS keychain is unavailable', () => {
  it('isKeychainAvailable returns false', () => {
    expect(isKeychainAvailable()).toBe(false)
  })

  it('setTokens throws a clear keychain-unavailable error (never writes plaintext)', async () => {
    await expect(setTokens(testProfile, sampleTokens)).rejects.toThrow(
      /keychain/i,
    )
  })

  it('getTokens returns null instead of crashing', async () => {
    await expect(getTokens(testProfile)).resolves.toBeNull()
  })

  it('deleteTokens is a no-op that does not throw', async () => {
    await expect(deleteTokens(testProfile)).resolves.toBeUndefined()
  })
})
