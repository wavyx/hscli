import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import open from 'open'
import createDebug from 'debug'
import { getTokens, setTokens } from './keychain.js'
import { getProfileConfig } from './config.js'
import {
  clientId as embeddedClientId,
  clientSecret as embeddedClientSecret,
} from './embedded-credentials.js'
import { ApiError, CliError } from './errors.js'

const debug = createDebug('hs:auth')
const TOKEN_URL = 'https://api.helpscout.net/v2/oauth2/token'
const AUTH_URL =
  'https://secure.helpscout.net/authentication/authorizeClientApplication'
const REFRESH_BUFFER_MS = 5 * 60 * 1000

/**
 * @typedef {object} ResolvedCredentials
 * @property {string} clientId
 * @property {string} clientSecret
 * @property {'flags' | 'env' | 'profile' | 'config' | 'embedded'} source
 */

/**
 * @param {object} options
 * @param {object} [options.flags]
 * @param {string} [options.flags.appId]
 * @param {string} [options.flags.appSecret]
 * @param {string} [options.profile]
 * @returns {ResolvedCredentials}
 */
export function resolveCredentials({ flags, profile } = {}) {
  if (flags?.appId && flags?.appSecret) {
    return {
      clientId: flags.appId,
      clientSecret: flags.appSecret,
      source: 'flags',
    }
  }

  if (process.env.HSCLI_APP_ID && process.env.HSCLI_APP_SECRET) {
    return {
      clientId: process.env.HSCLI_APP_ID,
      clientSecret: process.env.HSCLI_APP_SECRET,
      source: 'env',
    }
  }

  if (profile) {
    const id = getProfileConfig(profile, 'oauth_app_id')
    const secret = getProfileConfig(profile, 'oauth_app_secret')
    if (id && secret) {
      return { clientId: id, clientSecret: secret, source: 'profile' }
    }
  }

  return {
    clientId: embeddedClientId,
    clientSecret: embeddedClientSecret,
    source: 'embedded',
  }
}

/**
 * @param {object} options
 * @param {string} options.clientId
 * @param {string} options.clientSecret
 * @param {number} [options.timeout]
 * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: number}>}
 */
export function authorizationCodeFlow({
  clientId,
  clientSecret,
  timeout = 120_000,
}) {
  return new Promise((resolve, reject) => {
    const state = randomBytes(16).toString('hex')
    let timer

    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`)
      if (url.pathname !== '/callback') {
        res.writeHead(404)
        res.end()
        return
      }

      const code = url.searchParams.get('code')
      const returnedState = url.searchParams.get('state')

      if (returnedState !== state) {
        res.writeHead(400, { 'content-type': 'text/html' })
        res.end(
          '<h2>Authentication failed: state mismatch (possible CSRF attack)</h2>',
        )
        clearTimeout(timer)
        server.close()
        reject(
          new CliError('OAuth state mismatch — possible CSRF attack', {
            exitCode: 77,
          }),
        )
        return
      }

      if (!code) {
        res.writeHead(400, { 'content-type': 'text/html' })
        res.end(
          '<h2>Authentication failed: no authorization code received</h2>',
        )
        clearTimeout(timer)
        server.close()
        reject(new CliError('No authorization code received', { exitCode: 77 }))
        return
      }

      try {
        const tokens = await exchangeCode({
          code,
          clientId,
          clientSecret,
          redirectUri: `http://127.0.0.1:${server.address().port}/callback`,
        })
        res.writeHead(200, { 'content-type': 'text/html' })
        res.end('<h2>Authenticated! You can close this window.</h2>')
        clearTimeout(timer)
        server.close()
        resolve(tokens)
      } catch (err) {
        res.writeHead(500, { 'content-type': 'text/html' })
        res.end(`<h2>Authentication failed: ${err.message}</h2>`)
        clearTimeout(timer)
        server.close()
        reject(err)
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      const redirectUri = `http://127.0.0.1:${port}/callback`
      const authUrl = `${AUTH_URL}?client_id=${encodeURIComponent(clientId)}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`
      debug('opening browser for auth: %s', authUrl)
      open(authUrl)
    })

    timer = setTimeout(() => {
      server.close()
      reject(
        new CliError(
          `Authentication timed out after ${timeout / 1000}s. Try again.`,
          { exitCode: 77 },
        ),
      )
    }, timeout)
  })
}

async function exchangeCode({ code, clientId, clientSecret, redirectUri }) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  })

  const body = await res.json()
  if (!res.ok) {
    throw ApiError.fromResponse(
      res.status,
      JSON.stringify(body),
      '/v2/oauth2/token',
    )
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
  }
}

/**
 * @param {object} options
 * @param {string} options.clientId
 * @param {string} options.clientSecret
 * @returns {Promise<{accessToken: string, expiresIn: number}>}
 */
export async function clientCredentialsFlow({ clientId, clientSecret }) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  const body = await res.json()
  if (!res.ok) {
    throw ApiError.fromResponse(
      res.status,
      JSON.stringify(body),
      '/v2/oauth2/token',
    )
  }

  return {
    accessToken: body.access_token,
    expiresIn: body.expires_in,
  }
}

/**
 * @param {object} options
 * @param {string} options.refreshToken
 * @param {string} options.clientId
 * @param {string} options.clientSecret
 * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: number}>}
 */
export async function refreshAccessToken({
  refreshToken,
  clientId,
  clientSecret,
}) {
  debug('refreshing access token')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  const body = await res.json()
  if (!res.ok) {
    throw ApiError.fromResponse(
      res.status,
      JSON.stringify(body),
      '/v2/oauth2/token',
    )
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
  }
}

/**
 * @param {string} profile
 * @returns {Promise<string>}
 */
export async function getValidToken(profile) {
  const tokens = await getTokens(profile)
  if (!tokens) return null

  const now = Date.now()
  if (tokens.expiresAt - now > REFRESH_BUFFER_MS) {
    return tokens.accessToken
  }

  if (tokens.refreshToken) {
    const creds = resolveCredentials({ profile })
    const refreshed = await refreshAccessToken({
      refreshToken: tokens.refreshToken,
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
    })

    await setTokens(profile, {
      ...tokens,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: now + refreshed.expiresIn * 1000,
    })

    return refreshed.accessToken
  }

  if (tokens.authMode === 'client_credentials') {
    const creds = resolveCredentials({ profile })
    const result = await clientCredentialsFlow(creds)
    await setTokens(profile, {
      ...tokens,
      accessToken: result.accessToken,
      expiresAt: now + result.expiresIn * 1000,
    })
    return result.accessToken
  }

  return null
}
