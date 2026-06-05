# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.1] - 2026-06-05

### Fixed

- MCP: bulk operations (`conv bulk-status`) now carry the MCP `destructiveHint`, so clients prompt before running them — previously only `delete`/`remove` tools were flagged. Corrected the MCP guide to describe exactly which tools are marked destructive (`delete`/`remove`/`bulk`) versus plain writes (`create`/`update`).

## [0.10.0] - 2026-06-05

### Added

- **MCP server — `hscli mcp serve`.** Run hscli as a [Model Context Protocol](https://modelcontextprotocol.io) server over stdio so AI agents (Claude Desktop, Claude Code, …) drive Help Scout through native tools. One tool per command, generated from the command manifest so it stays in sync.
  - **Reads by default, writes opt-in.** Only read-only tools are exposed unless started with `--allow-writes`; mutating tools carry MCP `destructiveHint`/`readOnlyHint` annotations so clients can confirm dangerous calls.
  - Each tool call runs the CLI as a child process (keeping the stdio protocol channel clean) and returns the command's JSON as `structuredContent`. The `api` escape hatch, streaming `conv watch`, and bundled oclif plugin commands are not exposed.
  - Reuses the existing OS-keychain OAuth token and Docs API key — the server runs as you.
- New MCP guide with Claude Desktop / Claude Code configuration.

## [0.9.0] - 2026-06-04

### Added

- **Help Scout Docs API support** — a new `hscli docs` command group for the knowledge base. Docs is a separate product and authenticates with its own per-user API key, independent of the Mailbox OAuth login:
  - `docs auth` — validate and store the Docs API key in the OS keychain (or pass `HSCLI_DOCS_API_KEY` for CI).
  - **Read & search:** `docs site list|get`, `docs collection list|get`, `docs category list`, `docs article list|get|search`.
  - **Articles:** `docs article create|update|delete`, plus `docs article save-draft|delete-draft`.
  - **Collections & categories:** `docs collection create|update|delete`, `docs category create|update|delete`.
  - The Docs client is host-locked to `docsapi.helpscout.net` and shares hscli's retry/backoff, rate-limit handling, structured `--output table|json|yaml|csv`, and deterministic exit codes.
- Documentation: a new **Docs (knowledge base)** guide, separate-API-key coverage in the authentication guide, and a home-page recipe showing an agent turning inbox patterns into published articles. The generated command reference now spans all 88 commands.

## [0.8.1] - 2026-06-04

### Changed

- CI, release, and docs workflows now run on Node-24 action majors — `actions/checkout@v6`, `actions/setup-node@v6`, `codecov/codecov-action@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5` — clearing the Node-20 GitHub Actions runner deprecation.
- Docs site migrated off the deprecated top-level `markdown.smartypants` / `markdown.remarkPlugins` options to the Astro 6.4 `markdown.processor: unified({ … })` API (the old options are removed in Astro 8.0). No output change — code samples keep literal `--flags` and straight quotes.
- Routine minor/patch dependency bumps (Dependabot): `@inquirer/prompts`, `@oclif/plugin-help`, `@oclif/plugin-plugins`, `js-yaml`, `tar`, `eslint`, `oclif`, `vitest`, `@vitest/coverage-v8`.

## [0.8.0] - 2026-06-02

### Changed

- **BREAKING: the binary is now `hscli` instead of `hs`** to avoid a global-install collision with the HubSpot CLI (which also installs `hs`). Update scripts and aliases accordingly.

### Security

- **`hscli api` is now host-locked.** Requests whose path resolves to any host other than `api.helpscout.net` are refused, closing a token-exfiltration vector (e.g. `hscli api GET //evil.com/...`).
- **Token storage hard-fails when no OS keychain is available.** hscli no longer falls back to a weakly-obfuscated file; it refuses to write credentials to disk in plaintext (BREAKING for environments without a system keychain).
- The Authorization Code login now binds the loopback callback to the fixed port `9999`, matching the Redirection URL the `hscli auth setup` wizard registers, and fails with a clear message if the port is in use.
- All API requests now send a `hscli/<version>` `User-Agent`.

### Added

- `LICENSE` (MIT), `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue/PR templates, and Dependabot config.
- Automated release workflow (tag-triggered npm publish with provenance via OIDC trusted publishing + GitHub Release).
- Test coverage is now gated at 90% in CI; `CHANGELOG.md` ships in the npm tarball.

## [0.7.0] - 2026-05-28

### Added

- **Beacon utilities** — new `hs beacon` topic:
  - `hs beacon sign --email --secret` — HMAC-SHA256 signature for Beacon Secure Mode
  - `hs beacon verify --email --secret --signature` — verify a signature (exit 1 on mismatch)
  - `hs beacon embed <id> [--color] [--position] [--style] [--text] [--icon-image]` — generate `<script>` embed block
  - `hs beacon identify-snippet --beacon-id --secret --stack node|rails|php|django|python` — server-side identify code generator
- **Conversation source filter** — `hs conv list --source <type>` and `hs conv export --source <type>` with values `api|beacon|channel|chat|consumer|coreapi|customer|email`. Implemented as client-side post-fetch filter because Help Scout does not expose `source` as a query parameter.
- **Beacon-origin report** — `hs report beacon [--since N] [--mailbox]` aggregates conversation counts by `source.type` and `source.via` with percentages. Default window is 30 days.
- **Docs** — new `docs/beacon.md` covering supported commands, explicit list of Help Scout limitations (Beacon CRUD / stats are web-UI only, no REST endpoints), and per-stack snippet examples.

### Notes

- v0.6 (Distribution) was deferred. v0.7 prioritises functional surface coverage over packaging polish.
- Beacon configuration cannot be managed via the API — Help Scout does not expose `GET /v2/beacons` or related endpoints. `hs beacon` commands are utility helpers for working _with_ Beacon, not for managing its config.

## [0.5.0] - 2026-05-28

### Added

- **`hs backup`**: GDPR-style full account dump to a directory of JSON files.
  - Auto-incremental: subsequent runs sync only modified items via `modifiedSince`
  - `--full` forces re-sync
  - `--resume` continues an interrupted run from `checkpoint.json`
  - `--reconcile` detects deletions via ID-only scan, writes `_deleted.ndjson`
  - `--keep-history` appends per-run delta log to `_history/`
  - `--attachments` downloads thread attachment binaries (skips existing)
  - `--compress` produces `.tar.gz` of output dir
  - `--include`/`--exclude` filter resource set (users, teams, mailboxes, tags, workflows, webhooks, customers, conversations)
  - `--since` overrides per-resource `lastSyncedAt`
  - `--parallel N` caps concurrent attachment downloads
  - `--dry-run` previews without writes
  - Refuses to write into existing non-backup directories
- **`hs conv dump <id>`**: single-conversation self-contained JSON archive (conversation + threads + primary customer + tags + attachment metadata), outputs to stdout or `--out FILE`
- **`hs conv export --embed threads`**: include thread bodies inline via HAL `embed` query; JSON/NDJSON only (CSV incompatible). Only `threads` is supported by Help Scout's API on this endpoint.
- **Client**: array query values now serialize as repeated params (`?embed=threads&embed=customers`)
- **Docs**: `docs/backup.md` with output structure, modes, scheduling examples (cron, launchd, Task Scheduler)

### Dependencies

- Added `tar` for `--compress`

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
- **Aliases**: `alias set/list/unset` — custom command shortcuts
- **Machine-readable errors**: `--output json` outputs JSON error payload to stderr
- **Verbose error details**: `--verbose` shows full API request/response on errors
- **Pagination progress callback**: `client.paginate()` accepts `onProgress` option

### Removed

- `@oclif/plugin-not-found` — replaced by custom `command_not_found` hook that also handles alias expansion

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
