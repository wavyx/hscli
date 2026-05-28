import { createHmac } from 'node:crypto'
import { signEmail, verifyEmail } from '../../../src/lib/beacon/hmac.js'

describe('beacon/hmac', () => {
  const secret = 'test_secret_key'
  const email = 'user@example.com'
  const expected = createHmac('sha256', secret).update(email).digest('hex')

  it('signEmail returns hex HMAC-SHA256 of email', () => {
    expect(signEmail(secret, email)).toBe(expected)
    expect(signEmail(secret, email)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('signEmail differs across emails', () => {
    expect(signEmail(secret, 'a@b.com')).not.toBe(signEmail(secret, 'b@c.com'))
  })

  it('signEmail differs across secrets', () => {
    expect(signEmail('s1', email)).not.toBe(signEmail('s2', email))
  })

  it('signEmail coerces non-string email', () => {
    expect(signEmail(secret, 1234)).toBe(
      createHmac('sha256', secret).update('1234').digest('hex'),
    )
  })

  it('verifyEmail returns true on match', () => {
    expect(verifyEmail(secret, email, expected)).toBe(true)
  })

  it('verifyEmail returns false on tampered signature', () => {
    const bad = expected.slice(0, -1) + '0'
    expect(verifyEmail(secret, email, bad)).toBe(false)
  })

  it('verifyEmail returns false on wrong-length signature', () => {
    expect(verifyEmail(secret, email, 'short')).toBe(false)
  })

  it('verifyEmail returns false on non-string signature', () => {
    expect(verifyEmail(secret, email, undefined)).toBe(false)
    expect(verifyEmail(secret, email, 12345)).toBe(false)
  })
})
