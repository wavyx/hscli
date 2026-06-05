# hscli

[![npm version](https://img.shields.io/npm/v/@wavyx/hscli)](https://www.npmjs.com/package/@wavyx/hscli)
[![CI](https://github.com/wavyx/hscli/actions/workflows/ci.yml/badge.svg)](https://github.com/wavyx/hscli/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/wavyx/hscli/branch/main/graph/badge.svg)](https://codecov.io/gh/wavyx/hscli)
[![npm downloads](https://img.shields.io/npm/dm/@wavyx/hscli)](https://www.npmjs.com/package/@wavyx/hscli)
[![Node.js](https://img.shields.io/node/v/@wavyx/hscli)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-wavyx.github.io%2Fhscli-1292EE)](https://wavyx.github.io/hscli/)

Command-line interface for [Help Scout](https://www.helpscout.com/).

Covers the **Mailbox API 2.0** (conversations, customers, mailboxes, users, tags,
workflows, webhooks, reports) and the **Docs API** (knowledge base: sites, collections,
categories, articles, search), plus **Beacon** HMAC/snippet utilities and a full
account **backup**.

JSON output, deterministic exit codes, and a raw `hscli api` escape hatch make it
a clean way to drive Help Scout from CI pipelines and **AI agents** (Claude Code,
Codex, and similar) — no SDK glue required.

📖 **Documentation:** <https://wavyx.github.io/hscli/>

## Install

```bash
npm install -g @wavyx/hscli                 # npm (Node.js 20+)
brew tap wavyx/tap && brew install hscli    # Homebrew (macOS/Linux)
scoop bucket add hscli https://github.com/wavyx/scoop-hscli && scoop install hscli  # Scoop (Windows)
docker run --rm ghcr.io/wavyx/hscli --help  # Docker (no local Node)
```

The binary is `hscli`. The Docker image has no OS keychain, so use it for Docs
(`HSCLI_DOCS_API_KEY`), `api`, and stateless utilities rather than Mailbox OAuth.

> **Credential storage:** hscli stores OAuth tokens only in your operating system
> keychain (macOS Keychain, Windows Credential Manager, or libsecret on Linux).
> It will not write credentials to disk in plaintext — if no keychain is
> available, authentication fails by design.

## Quick start

You bring your own Help Scout OAuth app (Help Scout apps are account-scoped, so
there is no shared app). The `hscli auth setup` wizard walks you through creating
one.

```bash
hscli auth setup                          # Configure your OAuth app (one-time)
hscli auth login                          # Authenticate (opens browser)
hscli conv list                           # List conversations
hscli conv reply 123 --body "Thanks"      # Reply to a conversation
hscli customer create --email user@example.com --first Jane
hscli backup --out ~/hs-backup            # Full account backup (incremental on re-run)

# Docs knowledge base (separate per-user API key: `hscli docs auth` or HSCLI_DOCS_API_KEY)
hscli docs auth                           # Store your Docs API key in the keychain
hscli docs article search "refund"        # Search the knowledge base

# Run as an MCP server so AI agents call hscli as native tools (read-only by default)
hscli mcp serve                           # add --allow-writes to expose mutations
```

For CI/CD, use the non-interactive client-credentials flow:

```bash
HSCLI_APP_ID=... HSCLI_APP_SECRET=... hscli auth login --client-credentials
```

## Commands

| Topic            | Commands                                                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hscli auth`     | `setup`, `login`, `logout`, `status`, `refresh`                                                                                                                                           |
| `hscli conv`     | `list`, `get`, `create`, `reply`, `note`, `status`, `assign`, `tag`, `move`, `delete`, `threads`, `edit-note`, `dump`, `export`, `search`, `watch`, `count`, `attachments`, `bulk-status` |
| `hscli mailbox`  | `list`, `get`, `folders`, `fields`                                                                                                                                                        |
| `hscli customer` | `create`, `update`, `list`, `get`, `search`, `conversations`                                                                                                                              |
| `hscli user`     | `me`, `list`, `get`                                                                                                                                                                       |
| `hscli tag`      | `list`, `get`, `usage`                                                                                                                                                                    |
| `hscli workflow` | `list`, `run`                                                                                                                                                                             |
| `hscli webhook`  | `list`, `get`, `create`, `delete`                                                                                                                                                         |
| `hscli report`   | `company`, `user`, `conversations`, `beacon`                                                                                                                                              |
| `hscli beacon`   | `sign`, `verify`, `embed`, `identify-snippet` — HMAC + snippet utilities for Beacon Secure Mode                                                                                           |
| `hscli docs`     | `auth`, `site`, `collection`, `category`, `article` — read/search + full CRUD on collections, categories & articles (incl. drafts) in the Docs knowledge base (separate per-user API key) |
| `hscli profile`  | `list`, `use`, `current`                                                                                                                                                                  |
| `hscli config`   | `get`, `set`, `list`, `validate`                                                                                                                                                          |
| `hscli alias`    | `set`, `list`, `unset` — custom command shortcuts                                                                                                                                         |
| `hscli backup`   | Full account dump with incremental refresh, resume, deletion detection, attachments                                                                                                       |
| `hscli api`      | Raw API escape hatch: `hscli api GET /v2/conversations` (locked to `api.helpscout.net`)                                                                                                   |
| `hscli mcp`      | `serve` — run hscli as an MCP server so AI agents call commands as tools (read-only by default; `--allow-writes` to enable mutations)                                                     |
| `hscli doctor`   | Diagnostic checks                                                                                                                                                                         |
| `hscli version`  | Version info                                                                                                                                                                              |

Run `hscli --help` or `hscli <topic> --help` for details. Every list/get command
supports `--output table|json|yaml|csv`, `--jq`, and `--fields`.

## Documentation

- [Authentication](docs/authentication.md) — setup, login, profiles, CI/CD
- [Commands](docs/commands.md) — full command reference
- [Configuration](docs/configuration.md) — env vars, profiles, settings
- [API Reference](docs/api-reference.md) — Help Scout endpoints used
- [Backup & Data Portability](docs/backup.md) — `hscli backup`, `hscli conv dump`, `hscli conv export --embed`
- [Beacon](docs/beacon.md) — Beacon Secure Mode HMAC signing, embed/identify snippets, source-based reporting, limitations

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Eric Rodriguez
