import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import nock from 'nock'

vi.mock('../../src/lib/keychain.js', () => ({
  getTokens: vi.fn().mockResolvedValue(null),
  setTokens: vi.fn().mockResolvedValue(undefined),
  deleteTokens: vi.fn().mockResolvedValue(undefined),
  isKeychainAvailable: vi.fn().mockReturnValue(true),
}))

vi.mock('../../src/lib/config.js', () => ({
  getProfileConfig: vi.fn().mockReturnValue(undefined),
  loadConfig: vi.fn().mockReturnValue({ activeProfile: 'default' }),
  getActiveProfile: vi.fn().mockReturnValue('default'),
}))

/** @type {string | undefined} */
let capturedAuthUrl
vi.mock('open', () => ({
  default: vi.fn((url) => {
    capturedAuthUrl = url
  }),
}))

const { getTokens, setTokens } = await import('../../src/lib/keychain.js')
const { getProfileConfig } = await import('../../src/lib/config.js')

const {
  resolveCredentials,
  clientCredentialsFlow,
  refreshAccessToken,
  getValidToken,
  authorizationCodeFlow,
} = await import('../../src/lib/auth.js')

const TOKEN_URL = 'https://api.helpscout.net'

describe('resolveCredentials', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns flags when both app-id and app-secret provided', () => {
    const result = resolveCredentials({
      flags: { appId: 'flag-id', appSecret: 'flag-secret' },
    })
    expect(result.clientId).toBe('flag-id')
    expect(result.clientSecret).toBe('flag-secret')
    expect(result.source).toBe('flags')
  })

  it('returns env vars when HSCLI_APP_ID and HSCLI_APP_SECRET set', () => {
    process.env.HSCLI_APP_ID = 'env-id'
    process.env.HSCLI_APP_SECRET = 'env-secret'
    const result = resolveCredentials({})
    expect(result.clientId).toBe('env-id')
    expect(result.clientSecret).toBe('env-secret')
    expect(result.source).toBe('env')
  })

  it('flags take precedence over env vars', () => {
    process.env.HSCLI_APP_ID = 'env-id'
    process.env.HSCLI_APP_SECRET = 'env-secret'
    const result = resolveCredentials({
      flags: { appId: 'flag-id', appSecret: 'flag-secret' },
    })
    expect(result.source).toBe('flags')
  })

  it('throws ConfigError when no credentials configured', () => {
    expect(() => resolveCredentials({})).toThrow(
      'No OAuth app configured. Run: hs auth setup',
    )
  })
})

describe('clientCredentialsFlow', () => {
  afterEach(() => nock.cleanAll())

  it('sends form-urlencoded body, not JSON', async () => {
    const scope = nock(TOKEN_URL)
      .post('/v2/oauth2/token', (body) => {
        return (
          body.grant_type === 'client_credentials' &&
          body.client_id === 'test-id' &&
          body.client_secret === 'test-secret'
        )
      })
      .matchHeader('content-type', /application\/x-www-form-urlencoded/)
      .reply(200, {
        access_token: 'new-token',
        token_type: 'Bearer',
        expires_in: 172800,
      })

    const result = await clientCredentialsFlow({
      clientId: 'test-id',
      clientSecret: 'test-secret',
    })

    expect(result.accessToken).toBe('new-token')
    expect(result.expiresIn).toBe(172800)
    expect(scope.isDone()).toBe(true)
  })

  it('throws ApiError with error_description on failure', async () => {
    nock(TOKEN_URL).post('/v2/oauth2/token').reply(401, {
      error: 'invalid_client',
      error_description: 'Client authentication failed',
    })

    await expect(
      clientCredentialsFlow({ clientId: 'bad', clientSecret: 'bad' }),
    ).rejects.toThrow('Client authentication failed')
  })
})

describe('refreshAccessToken', () => {
  afterEach(() => nock.cleanAll())

  it('sends form-urlencoded refresh request', async () => {
    const scope = nock(TOKEN_URL)
      .post('/v2/oauth2/token', (body) => {
        return (
          body.grant_type === 'refresh_token' &&
          body.refresh_token === 'old-refresh'
        )
      })
      .matchHeader('content-type', /application\/x-www-form-urlencoded/)
      .reply(200, {
        access_token: 'refreshed-token',
        refresh_token: 'new-refresh',
        expires_in: 172800,
      })

    const result = await refreshAccessToken({
      refreshToken: 'old-refresh',
      clientId: 'test-id',
      clientSecret: 'test-secret',
    })

    expect(result.accessToken).toBe('refreshed-token')
    expect(result.refreshToken).toBe('new-refresh')
    expect(scope.isDone()).toBe(true)
  })

  it('throws ApiError on refresh failure', async () => {
    nock(TOKEN_URL).post('/v2/oauth2/token').reply(401, {
      error: 'invalid_grant',
      error_description: 'Refresh token is invalid',
    })

    await expect(
      refreshAccessToken({
        refreshToken: 'bad-refresh',
        clientId: 'test-id',
        clientSecret: 'test-secret',
      }),
    ).rejects.toThrow('Refresh token is invalid')
  })
})

describe('getValidToken', () => {
  afterEach(() => {
    nock.cleanAll()
    vi.restoreAllMocks()
  })

  it('returns null when no tokens are stored', async () => {
    getTokens.mockResolvedValueOnce(null)

    const result = await getValidToken('default')
    expect(result).toBeNull()
  })

  it('returns accessToken when token is not expired', async () => {
    getTokens.mockResolvedValueOnce({
      accessToken: 'valid-token',
      refreshToken: 'rt',
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
      authMode: 'authorization_code',
    })

    const result = await getValidToken('default')
    expect(result).toBe('valid-token')
  })

  it('refreshes token when within 5-minute expiry buffer', async () => {
    getProfileConfig
      .mockReturnValueOnce('profile-id')
      .mockReturnValueOnce('profile-secret')
    getTokens.mockResolvedValueOnce({
      accessToken: 'expiring-token',
      refreshToken: 'my-refresh-token',
      expiresAt: Date.now() + 2 * 60 * 1000, // 2 min from now — within buffer
      authMode: 'authorization_code',
    })

    const scope = nock(TOKEN_URL)
      .post('/v2/oauth2/token', (body) => {
        return (
          body.grant_type === 'refresh_token' &&
          body.refresh_token === 'my-refresh-token'
        )
      })
      .reply(200, {
        access_token: 'fresh-token',
        refresh_token: 'fresh-refresh',
        expires_in: 172800,
      })

    const result = await getValidToken('default')

    expect(result).toBe('fresh-token')
    expect(scope.isDone()).toBe(true)
    expect(setTokens).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        accessToken: 'fresh-token',
        refreshToken: 'fresh-refresh',
      }),
    )
  })

  it('re-authenticates via client_credentials when token expired and no refresh token', async () => {
    getProfileConfig
      .mockReturnValueOnce('profile-id')
      .mockReturnValueOnce('profile-secret')
    getTokens.mockResolvedValueOnce({
      accessToken: 'expired-token',
      expiresAt: Date.now() - 1000, // already expired
      authMode: 'client_credentials',
    })

    const scope = nock(TOKEN_URL)
      .post('/v2/oauth2/token', (body) => {
        return body.grant_type === 'client_credentials'
      })
      .reply(200, {
        access_token: 'cc-fresh-token',
        expires_in: 172800,
      })

    const result = await getValidToken('default')

    expect(result).toBe('cc-fresh-token')
    expect(scope.isDone()).toBe(true)
    expect(setTokens).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        accessToken: 'cc-fresh-token',
        authMode: 'client_credentials',
      }),
    )
  })

  it('returns null when token expired, no refresh token, and authMode is not client_credentials', async () => {
    getTokens.mockResolvedValueOnce({
      accessToken: 'expired-token',
      expiresAt: Date.now() - 1000,
      authMode: 'authorization_code',
      // no refreshToken
    })

    const result = await getValidToken('default')
    expect(result).toBeNull()
  })
})

describe('resolveCredentials with profile config', () => {
  it('returns profile config when oauth_app_id and oauth_app_secret are set', () => {
    getProfileConfig
      .mockReturnValueOnce('profile-id')
      .mockReturnValueOnce('profile-secret')

    const result = resolveCredentials({ profile: 'myprofile' })
    expect(result.clientId).toBe('profile-id')
    expect(result.clientSecret).toBe('profile-secret')
    expect(result.source).toBe('profile')
  })

  it('throws ConfigError when profile has only oauth_app_id but no secret', () => {
    getProfileConfig
      .mockReturnValueOnce('profile-id')
      .mockReturnValueOnce(undefined)

    expect(() => resolveCredentials({ profile: 'myprofile' })).toThrow(
      'No OAuth app configured',
    )
  })
})

describe('authorizationCodeFlow', () => {
  afterEach(() => {
    nock.cleanAll()
    capturedAuthUrl = undefined
  })

  it('resolves with tokens on successful callback', async () => {
    nock(TOKEN_URL)
      .post('/v2/oauth2/token', (body) => body.grant_type === 'authorization_code')
      .reply(200, {
        access_token: 'auth-code-token',
        refresh_token: 'auth-code-refresh',
        expires_in: 172800,
      })

    const flowPromise = authorizationCodeFlow({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      timeout: 5000,
    })

    // Wait for the server to start and open to be called
    await vi.waitFor(() => expect(capturedAuthUrl).toBeDefined())

    // Extract state and port from the captured auth URL
    const authUrl = new URL(capturedAuthUrl)
    const state = authUrl.searchParams.get('state')
    const redirectUri = authUrl.searchParams.get('redirect_uri')
    const callbackUrl = new URL(redirectUri)

    // Hit the callback server with the correct state and code
    await fetch(
      `http://127.0.0.1:${callbackUrl.port}/callback?code=test-code&state=${state}`,
    )

    const result = await flowPromise
    expect(result.accessToken).toBe('auth-code-token')
    expect(result.refreshToken).toBe('auth-code-refresh')
    expect(result.expiresIn).toBe(172800)
  })

  it('returns 404 for non-callback paths', async () => {
    const flowPromise = authorizationCodeFlow({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      timeout: 5000,
    })

    await vi.waitFor(() => expect(capturedAuthUrl).toBeDefined())

    const authUrl = new URL(capturedAuthUrl)
    const redirectUri = authUrl.searchParams.get('redirect_uri')
    const callbackUrl = new URL(redirectUri)

    const res = await fetch(`http://127.0.0.1:${callbackUrl.port}/not-callback`)
    expect(res.status).toBe(404)

    // Now send the correct state so the flow can resolve and the server closes
    const state = authUrl.searchParams.get('state')
    nock(TOKEN_URL)
      .post('/v2/oauth2/token')
      .reply(200, {
        access_token: 'tok',
        refresh_token: 'rt',
        expires_in: 100,
      })

    await fetch(
      `http://127.0.0.1:${callbackUrl.port}/callback?code=c&state=${state}`,
    )
    await flowPromise
  })

  it('rejects with state mismatch error', async () => {
    const flowPromise = authorizationCodeFlow({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      timeout: 5000,
    })
    // Attach rejection handler immediately to avoid unhandled rejection warning
    const assertion = expect(flowPromise).rejects.toThrow('OAuth state mismatch')

    await vi.waitFor(() => expect(capturedAuthUrl).toBeDefined())

    const authUrl = new URL(capturedAuthUrl)
    const redirectUri = authUrl.searchParams.get('redirect_uri')
    const callbackUrl = new URL(redirectUri)

    // Send a wrong state value
    await fetch(
      `http://127.0.0.1:${callbackUrl.port}/callback?code=test-code&state=wrong-state`,
    )

    await assertion
  })

  it('rejects when no authorization code is provided', async () => {
    const flowPromise = authorizationCodeFlow({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      timeout: 5000,
    })
    const assertion = expect(flowPromise).rejects.toThrow('No authorization code received')

    await vi.waitFor(() => expect(capturedAuthUrl).toBeDefined())

    const authUrl = new URL(capturedAuthUrl)
    const state = authUrl.searchParams.get('state')
    const redirectUri = authUrl.searchParams.get('redirect_uri')
    const callbackUrl = new URL(redirectUri)

    // Send correct state but no code
    await fetch(
      `http://127.0.0.1:${callbackUrl.port}/callback?state=${state}`,
    )

    await assertion
  })

  it('rejects when token exchange fails', async () => {
    nock(TOKEN_URL)
      .post('/v2/oauth2/token')
      .reply(400, {
        error: 'invalid_grant',
        error_description: 'Authorization code expired',
      })

    const flowPromise = authorizationCodeFlow({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      timeout: 5000,
    })
    const assertion = expect(flowPromise).rejects.toThrow('Authorization code expired')

    await vi.waitFor(() => expect(capturedAuthUrl).toBeDefined())

    const authUrl = new URL(capturedAuthUrl)
    const state = authUrl.searchParams.get('state')
    const redirectUri = authUrl.searchParams.get('redirect_uri')
    const callbackUrl = new URL(redirectUri)

    await fetch(
      `http://127.0.0.1:${callbackUrl.port}/callback?code=expired-code&state=${state}`,
    )

    await assertion
  })

  it('rejects on timeout', async () => {
    const flowPromise = authorizationCodeFlow({
      clientId: 'test-id',
      clientSecret: 'test-secret',
      timeout: 50, // very short timeout
    })

    await expect(flowPromise).rejects.toThrow('Authentication timed out')
  })
})
