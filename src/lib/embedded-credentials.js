// Public OAuth client credentials for hscli.
// These are intentionally public per RFC 8252 (OAuth 2.0 for Native Apps).
// Security relies on loopback-only redirect URIs + CSRF state parameter,
// not on client_secret confidentiality.
// Override with --app-id/--app-secret flags, env vars, or `hs auth setup`.

export const clientId = 'PLACEHOLDER_CLIENT_ID'
export const clientSecret = 'PLACEHOLDER_CLIENT_SECRET'
