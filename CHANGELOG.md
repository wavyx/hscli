# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-27

### Added

- **Authentication**: OAuth2 Authorization Code and Client Credentials flows
- **Hybrid OAuth model**: embedded public credentials for zero-setup onboarding, with BYO override via flags, env vars, or profile config
- **Profiles**: multi-account support with OS keychain storage (`hs profile list/use/current`)
- **Conversations**: `hs conv list` with filters (--status, --mailbox, --tag, --assigned-to, --query, --since, --limit) and `hs conv get <id>`
- **Mailboxes**: `hs mailbox list` and `hs mailbox get <id>`
- **Users**: `hs user me` for current authenticated user
- **Configuration**: `hs config get/set/list` with 12-factor precedence (flags > env > profile > global > defaults)
- **Diagnostics**: `hs doctor` with 6 health checks (config, keychain, tokens, expiry, API reachability)
- **Output formats**: `--output table` (default in TTY) and `--output json` (default when piped)
- **Token management**: auto-refresh on expiry, secure OS keychain storage via @napi-rs/keyring with encrypted file fallback
- **Kill-switch**: version manifest check for compromised versions or revoked OAuth apps
- **CI**: GitHub Actions workflow (Node 20/22 × ubuntu/macos/windows)
- **Developer tooling**: ESLint 9 flat config, Prettier, Vitest with 100% test coverage

### Technical

- Built on oclif v4 with plain JavaScript (ESM, JSDoc-typed)
- 17 commands across 7 topics
- 196 tests, 100% statement/line/function/branch coverage
- Help Scout Inbox API 2.0 with HAL+JSON pagination, rate limit handling, and retry with exponential backoff
