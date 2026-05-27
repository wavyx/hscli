import { describe, it, expect, afterEach } from 'vitest'

// Mock @napi-rs/keyring to simulate unavailable native module
vi.mock('@napi-rs/keyring', () => {
  throw new Error('Native module not available')
})

const { getTokens, setTokens, deleteTokens, isKeychainAvailable } =
  await import('../../src/lib/keychain.js')

const testProfile = `hscli-fallback-test-${Date.now()}`

const sampleTokens = {
  accessToken: 'fallback-access-token',
  refreshToken: 'fallback-refresh-token',
  expiresAt: Date.now() + 3600_000,
  authMode: 'authorization_code',
  credentialSource: 'byo',
}

describe('keychain fallback (no native keyring)', () => {
  afterEach(async () => {
    await deleteTokens(testProfile)
  })

  it('isKeychainAvailable returns false', () => {
    expect(isKeychainAvailable()).toBe(false)
  })

  it('stores and retrieves tokens via fallback store', async () => {
    await setTokens(testProfile, sampleTokens)
    const result = await getTokens(testProfile)
    expect(result).toEqual(sampleTokens)
  })

  it('deletes tokens via fallback store', async () => {
    await setTokens(testProfile, sampleTokens)
    await deleteTokens(testProfile)
    const result = await getTokens(testProfile)
    expect(result).toBeNull()
  })

  it('returns null for non-existent profile', async () => {
    const result = await getTokens(`no-such-fallback-${Date.now()}`)
    expect(result).toBeNull()
  })

  it('does not throw when deleting non-existent profile', async () => {
    await expect(
      deleteTokens(`nonexistent-fallback-${Date.now()}`),
    ).resolves.toBeUndefined()
  })
})
