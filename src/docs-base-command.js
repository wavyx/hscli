import { Flags } from '@oclif/core'
import BaseCommand from './base-command.js'
import { resolveDocsKey } from './lib/docs-auth.js'
import { createDocsClient } from './lib/docs-client.js'

/**
 * Base for `hscli docs …` commands. The Docs API is a separate product with
 * its own per-user API key, so these commands skip the Mailbox OAuth flow
 * (skipAuth) and build a Docs client from the resolved Docs key instead.
 */
export default class DocsBaseCommand extends BaseCommand {
  static skipAuth = true

  static baseFlags = {
    ...BaseCommand.baseFlags,
    'api-key': Flags.string({
      description: 'Docs API key (overrides env/keychain)',
      helpGroup: 'GLOBAL',
    }),
  }

  /** @type {import('./lib/docs-client.js').createDocsClient} */
  docsClient

  async init() {
    await super.init() // loads config + flags; skips Mailbox auth via skipAuth
    const { apiKey } = await resolveDocsKey({
      flags: { apiKey: this.flags['api-key'] },
      profile: this.activeProfile,
    })
    this.docsClient = createDocsClient({
      apiKey,
      retry: !this.flags['no-retry'],
      timeout: this.flags.timeout,
      userAgent: `hscli/${this.config.version}`,
    })
  }
}
