import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Compute the HMAC-SHA256 signature of an email for Beacon Secure Mode.
 * @param {string} secret The secret key from Beacon settings
 * @param {string} email  The customer's email address
 * @returns {string} hex-encoded signature
 */
export function signEmail(secret, email) {
  return createHmac('sha256', secret).update(String(email)).digest('hex')
}

/**
 * Constant-time comparison of a candidate signature against a fresh one.
 * @param {string} secret
 * @param {string} email
 * @param {string} signature hex string to verify
 * @returns {boolean}
 */
export function verifyEmail(secret, email, signature) {
  const expected = signEmail(secret, email)
  if (typeof signature !== 'string' || signature.length !== expected.length) {
    return false
  }
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
