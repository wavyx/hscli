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

const { default: BeaconEmbedCommand } =
  await import('../../../src/commands/beacon/embed.js')

describe('hs beacon embed', () => {
  it('emits a basic embed snippet', async () => {
    const stdout = await runCmd(BeaconEmbedCommand, ['abc-123'])
    expect(stdout).toContain("window.Beacon('init', 'abc-123')")
    expect(stdout).toContain('beacon-v2.helpscout.net')
  })

  it('embeds color when --color provided', async () => {
    const stdout = await runCmd(BeaconEmbedCommand, ['id', '--color', '#abc'])
    expect(stdout).toContain('#abc')
    expect(stdout).toContain("'config'")
  })

  it('embeds full display config', async () => {
    const stdout = await runCmd(BeaconEmbedCommand, [
      'id',
      '--color',
      '#000',
      '--position',
      'right',
      '--style',
      'iconAndText',
      '--text',
      'Help',
      '--icon-image',
      'buoy',
    ])
    expect(stdout).toContain('right')
    expect(stdout).toContain('iconAndText')
    expect(stdout).toContain('Help')
    expect(stdout).toContain('buoy')
  })

  it('rejects missing beacon id arg', async () => {
    let err
    try {
      await BeaconEmbedCommand.run([])
    } catch (e) {
      err = e
    }
    expect(err).toBeDefined()
  })
})
