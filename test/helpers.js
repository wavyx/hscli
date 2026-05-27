import { runCommand } from '@oclif/test'
import nock from 'nock'
import { vi } from 'vitest'

export const API_BASE = 'https://api.helpscout.net'
export const TOKEN_URL = 'https://api.helpscout.net/v2/oauth2/token'

export function mockApi() {
  return nock(API_BASE)
}

export function mockTokenExchange(overrides = {}) {
  return nock(API_BASE)
    .post('/v2/oauth2/token')
    .reply(200, {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      token_type: 'Bearer',
      expires_in: 172800,
      ...overrides,
    })
}

/**
 * Run an oclif command class and capture its console.log output.
 * Oclif Command.log ultimately calls console.log via @oclif/core ux.stdout.
 */
export async function runCmd(CmdClass, argv = []) {
  const lines = []
  const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
    lines.push(args.map(String).join(' '))
  })
  try {
    await CmdClass.run(argv)
  } catch {
    // swallow oclif exit/error throws
  }
  spy.mockRestore()
  return lines.join('\n')
}

export { runCommand }
