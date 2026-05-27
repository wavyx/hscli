import { describe, it, expect, afterEach } from 'vitest'
import {
  getTokens,
  setTokens,
  deleteTokens,
  isKeychainAvailable,
} from '../../src/lib/keychain.js'

const testProfile = `hscli-test-${Date.now()}`

const sampleTokens = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresAt: Date.now() + 3600_000,
  authMode: 'authorization_code',
  credentialSource: 'byo',
}

describe('keychain', () => {
  afterEach(async () => {
    await deleteTokens(testProfile)
  })

  describe('setTokens + getTokens round-trip', () => {
    it('stores and retrieves tokens', async () => {
      await setTokens(testProfile, sampleTokens)
      const result = await getTokens(testProfile)
      expect(result).toEqual(sampleTokens)
    })
  })

  describe('deleteTokens', () => {
    it('removes stored tokens so getTokens returns null', async () => {
      await setTokens(testProfile, sampleTokens)
      const before = await getTokens(testProfile)
      expect(before).toEqual(sampleTokens)

      await deleteTokens(testProfile)
      const after = await getTokens(testProfile)
      expect(after).toBeNull()
    })
  })

  describe('getTokens', () => {
    it('returns null for a non-existent profile', async () => {
      const result = await getTokens(`no-such-profile-${Date.now()}`)
      expect(result).toBeNull()
    })
  })

  describe('isKeychainAvailable', () => {
    it('returns a boolean', () => {
      const result = isKeychainAvailable()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('deleteTokens error handling', () => {
    it('does not throw when deleting tokens for a non-existent profile', async () => {
      // deleteTokens should silently succeed even if the profile never existed
      await expect(
        deleteTokens(`nonexistent-profile-${Date.now()}`),
      ).resolves.toBeUndefined()
    })
  })

  describe('getTokens error handling', () => {
    it('returns null when profile has no stored tokens', async () => {
      const result = await getTokens(`empty-profile-${Date.now()}`)
      expect(result).toBeNull()
    })
  })

  describe('getTokens with corrupted data', () => {
    it('returns null when stored data is not valid JSON', async () => {
      // Store corrupted data directly via the keyring Entry
      const { Entry } = await import('@napi-rs/keyring')
      const corruptProfile = `corrupt-test-${Date.now()}`
      const entry = new Entry('hscli', `${corruptProfile}/tokens`)
      entry.setPassword('not-valid-json{{{')

      const result = await getTokens(corruptProfile)
      expect(result).toBeNull()

      // Clean up
      entry.deletePassword()
    })
  })

  describe('setTokens + deleteTokens + getTokens lifecycle', () => {
    it('returns null after tokens are deleted', async () => {
      const lifecycleProfile = `lifecycle-test-${Date.now()}`
      const tokens = {
        accessToken: 'lifecycle-access',
        refreshToken: 'lifecycle-refresh',
        expiresAt: Date.now() + 3600_000,
        authMode: 'client_credentials',
        credentialSource: 'byo',
      }

      await setTokens(lifecycleProfile, tokens)
      const stored = await getTokens(lifecycleProfile)
      expect(stored).toEqual(tokens)

      await deleteTokens(lifecycleProfile)
      const afterDelete = await getTokens(lifecycleProfile)
      expect(afterDelete).toBeNull()

      // Deleting again should not throw
      await expect(deleteTokens(lifecycleProfile)).resolves.toBeUndefined()
    })
  })
})
