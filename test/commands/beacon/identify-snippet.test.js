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

const { default: BeaconIdentifySnippetCommand } =
  await import('../../../src/commands/beacon/identify-snippet.js')

describe('hs beacon identify-snippet', () => {
  it('defaults to node stack', async () => {
    const stdout = await runCmd(BeaconIdentifySnippetCommand, [
      '--beacon-id',
      'id',
      '--secret',
      'sec',
    ])
    expect(stdout).toContain('createHmac')
    expect(stdout).toContain('Node.js')
  })

  it('emits rails template', async () => {
    const stdout = await runCmd(BeaconIdentifySnippetCommand, [
      '--beacon-id',
      'id',
      '--secret',
      'sec',
      '--stack',
      'rails',
    ])
    expect(stdout).toContain('OpenSSL::HMAC.hexdigest')
  })

  it('emits php template', async () => {
    const stdout = await runCmd(BeaconIdentifySnippetCommand, [
      '--beacon-id',
      'id',
      '--secret',
      'sec',
      '--stack',
      'php',
    ])
    expect(stdout).toContain('hash_hmac')
  })

  it('emits django template', async () => {
    const stdout = await runCmd(BeaconIdentifySnippetCommand, [
      '--beacon-id',
      'id',
      '--secret',
      'sec',
      '--stack',
      'django',
    ])
    expect(stdout).toContain('import hmac')
    expect(stdout).toContain('Django')
  })

  it('emits python template', async () => {
    const stdout = await runCmd(BeaconIdentifySnippetCommand, [
      '--beacon-id',
      'id',
      '--secret',
      'sec',
      '--stack',
      'python',
    ])
    expect(stdout).toContain('Generic Python')
  })

  it('rejects unknown stack', async () => {
    let err
    try {
      await BeaconIdentifySnippetCommand.run([
        '--beacon-id',
        'id',
        '--secret',
        'sec',
        '--stack',
        'cobol',
      ])
    } catch (e) {
      err = e
    }
    expect(err).toBeDefined()
  })
})
