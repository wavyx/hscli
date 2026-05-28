import { createHmac } from 'node:crypto'
import { runCmd } from '../../helpers.js'

vi.mock('../../../src/lib/keychain.js', () => ({
  getTokens: vi.fn(),
  setTokens: vi.fn(),
  deleteTokens: vi.fn(),
  isKeychainAvailable: vi.fn().mockReturnValue(true),
}))

vi.mock('../../../src/lib/config.js', () => ({
  loadConfig: vi.fn().mockReturnValue({ activeProfile: 'default' }),
  getActiveProfile: vi.fn().mockReturnValue('default'),
  setActiveProfile: vi.fn(),
  getConf: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue('default'),
    set: vi.fn(),
    path: '/tmp/test-config',
  }),
  getProfileConfig: vi.fn().mockReturnValue(undefined),
  setProfileConfig: vi.fn(),
  getProfileData: vi.fn().mockReturnValue({}),
  getAllProfiles: vi.fn().mockReturnValue({ default: {} }),
  deleteProfileConfig: vi.fn(),
}))

vi.mock('../../../src/lib/auth.js', () => ({
  getValidToken: vi.fn().mockResolvedValue(null),
  resolveCredentials: vi.fn().mockReturnValue({}),
  refreshAccessToken: vi.fn(),
}))

const { default: BeaconVerifyCommand } =
  await import('../../../src/commands/beacon/verify.js')

describe('hs beacon verify', () => {
  const secret = 'abc'
  const email = 'user@example.com'
  const valid = createHmac('sha256', secret).update(email).digest('hex')

  it('prints "valid" on matching signature', async () => {
    const stdout = await runCmd(BeaconVerifyCommand, [
      '--email',
      email,
      '--secret',
      secret,
      '--signature',
      valid,
    ])
    expect(stdout.trim()).toBe('valid')
  })

  it('prints "invalid" and sets process.exitCode to 1 on mismatch', async () => {
    const prev = process.exitCode
    process.exitCode = 0
    const stdout = await runCmd(BeaconVerifyCommand, [
      '--email',
      email,
      '--secret',
      secret,
      '--signature',
      valid.replace(/.$/, '0'),
    ])
    expect(stdout.trim()).toBe('invalid')
    expect(process.exitCode).toBe(1)
    process.exitCode = prev
  })

  it('outputs JSON with --output json (valid)', async () => {
    const stdout = await runCmd(BeaconVerifyCommand, [
      '--email',
      email,
      '--secret',
      secret,
      '--signature',
      valid,
      '--output',
      'json',
    ])
    const obj = JSON.parse(stdout)
    expect(obj.valid).toBe(true)
    expect(obj.email).toBe(email)
  })

  it('outputs JSON with --output json (invalid)', async () => {
    const stdout = await runCmd(BeaconVerifyCommand, [
      '--email',
      email,
      '--secret',
      secret,
      '--signature',
      'bogus',
      '--output',
      'json',
    ])
    expect(stdout).toBeDefined()
    const obj = JSON.parse(stdout)
    expect(obj.valid).toBe(false)
  })
})
