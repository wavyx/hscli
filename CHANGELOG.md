# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-27

### Added

- **Write commands**: `conv create`, `reply`, `note`, `status`, `assign`, `tag`, `move`, `delete`
- **Customer commands**: `customer create`, `customer update`
- **Auth setup wizard**: `hs auth setup` for BYO OAuth app configuration (interactive + non-interactive)
- **Body input helper**: `--body` supports inline text, `@file` paths, and stdin pipe
- **Confirmation prompt**: `conv delete` requires confirmation (`--yes` to skip)
- **JSON Patch**: `client.jsonPatch()` for RFC 6902 operations (status, assign, move, customer update)
- **`--verbose` flag**: enables `DEBUG=hs:*` logging on all commands
- **Documentation**: `docs/authentication.md`, `docs/api-reference.md`, `docs/commands.md`, `docs/configuration.md`

### Changed

- **Auth model**: simplified to BYO-only — Help Scout OAuth apps are account-scoped, no shared app possible
- **README**: slimmed to quick start + links to docs/

### Removed

- Embedded OAuth credentials (`embedded-credentials.js`) — dead code
- Kill-switch manifest check (`kill-switch.js`) — unnecessary without embedded app

## [0.1.0] - 2026-05-27

### Added

- **Authentication**: OAuth2 Authorization Code and Client Credentials flows
- **Profiles**: multi-account support with OS keychain storage (`hs profile list/use/current`)
- **Conversations**: `hs conv list` with filters (--status, --mailbox, --tag, --assigned-to, --query, --since, --limit) and `hs conv get <id>`
- **Mailboxes**: `hs mailbox list` and `hs mailbox get <id>`
- **Users**: `hs user me` for current authenticated user
- **Configuration**: `hs config get/set/list` with 12-factor precedence (flags > env > profile > global > defaults)
- **Diagnostics**: `hs doctor` with 6 health checks (config, keychain, tokens, expiry, API reachability)
- **Output formats**: `--output table` (default in TTY) and `--output json` (default when piped)
- **Token management**: auto-refresh on expiry, secure OS keychain storage via @napi-rs/keyring with encrypted file fallback
- **CI**: GitHub Actions workflow (Node 20/22 × ubuntu/macos/windows)
- **Developer tooling**: ESLint 9 flat config, Prettier, Vitest with 100% test coverage
