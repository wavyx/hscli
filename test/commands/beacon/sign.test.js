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

const { default: BeaconSignCommand } =
  await import('../../../src/commands/beacon/sign.js')

describe('hs beacon sign', () => {
  const secret = 'abc'
  const email = 'user@example.com'
  const expected = createHmac('sha256', secret).update(email).digest('hex')

  it('prints HMAC signature to stdout', async () => {
    const stdout = await runCmd(BeaconSignCommand, [
      '--email',
      email,
      '--secret',
      secret,
    ])
    expect(stdout.trim()).toBe(expected)
  })

  it('outputs JSON with --output json', async () => {
    const stdout = await runCmd(BeaconSignCommand, [
      '--email',
      email,
      '--secret',
      secret,
      '--output',
      'json',
    ])
    const obj = JSON.parse(stdout)
    expect(obj.email).toBe(email)
    expect(obj.signature).toBe(expected)
  })

  it('rejects missing --email', async () => {
    let err
    try {
      await BeaconSignCommand.run(['--secret', secret])
    } catch (e) {
      err = e
    }
    expect(err).toBeDefined()
  })

  it('rejects missing --secret', async () => {
    let err
    try {
      await BeaconSignCommand.run(['--email', email])
    } catch (e) {
      err = e
    }
    expect(err).toBeDefined()
  })
})
