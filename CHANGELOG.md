# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-05-27

### Added

- **Live tail**: `conv watch` with `--poll` interval and `--mailbox`/`--status` filters
- **Full-text search**: `conv search <query>` with mailbox filter
- **Bulk export**: `conv export --format json|csv|ndjson` with pagination progress
- **Batch operations**: `conv bulk-status --set closed --tag X` with confirmation
- **Conversation count**: `conv count --status active --mailbox X` without fetching full list
- **Attachments**: `conv attachments <id>` lists files from conversation threads
- **Mailbox folders**: `mailbox folders <id>` lists folder structure
- **Mailbox fields**: `mailbox fields <id>` lists custom fields
- **Tag usage**: `tag usage <name>` shows conversation count per tag
- **Config validation**: `config validate` checks profile, OAuth app, keychain
- **Auto .env loading**: CLI auto-loads `.env` from current directory
- **`--no-retry` flag**: disable automatic retry on rate limits and 5xx errors
- **`--timeout` flag**: override default 30s request timeout

## [0.3.0] - 2026-05-27

### Added

- **Tag commands**: `tag list`, `tag get`
- **User commands**: `user list`, `user get` (with --mailbox, --email filters)
- **Customer read commands**: `customer list`, `customer get`, `customer search`, `customer conversations`
- **Workflow commands**: `workflow list`, `workflow run` (max 50 conversation IDs)
- **Webhook commands**: `webhook list`, `webhook get`, `webhook create`, `webhook delete`
- **Report commands**: `report company`, `report user`, `report conversations` (with --start/--end date range)
- **Raw API escape hatch**: `hs api <method> <path> [--body]` for any endpoint
- **Output formats**: `--output yaml` (via js-yaml), `--output csv` (with proper escaping)
- **jq filtering**: `--jq '<expr>'` filters JSON output inline via node-jq
- **Field projection**: `--fields id,name` limits displayed columns

## [0.2.0] - 2026-05-27

### Added

- **Write commands**: `conv create`, `reply`, `note`, `status`, `assign`, `tag`, `move`, `delete`, `threads`, `edit-note`
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

### Fixed

- Reply endpoint requires `customer` field — CLI now fetches conversation first
- Conversation PATCH uses single JSON Patch object, not array
- ISO dates stripped of milliseconds for Help Scout compatibility

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
