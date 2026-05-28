# hscli

Command-line interface for [Help Scout](https://www.helpscout.com/).

Currently covers the **Mailbox API 2.0** (conversations, customers, mailboxes, users, tags, workflows, webhooks, reports). Aims to expand to **Docs**, **Beacon**, and **Help Desk** APIs over time.

## Install

```bash
npm install -g hscli
```

Requires Node.js 20+.

## Quick Start

```bash
hs auth setup                          # Configure OAuth app (one-time)
hs auth login                          # Authenticate
hs conv list                           # List conversations
hs conv reply 123 --body "Thanks"      # Reply to a conversation
hs customer create --email user@example.com --first Jane
hs backup --out ~/hs-backup            # Full account backup (incremental on re-run)
```

## Commands

| Topic         | Commands                                                                                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hs auth`     | `setup`, `login`, `logout`, `status`, `refresh`                                                                                                                                           |
| `hs conv`     | `list`, `get`, `create`, `reply`, `note`, `status`, `assign`, `tag`, `move`, `delete`, `threads`, `edit-note`, `dump`, `export`, `search`, `watch`, `count`, `attachments`, `bulk-status` |
| `hs mailbox`  | `list`, `get`                                                                                                                                                                             |
| `hs user`     | `me`, `list`, `get`                                                                                                                                                                       |
| `hs customer` | `create`, `update`, `list`, `get`, `search`, `conversations`                                                                                                                              |
| `hs tag`      | `list`, `get`                                                                                                                                                                             |
| `hs workflow` | `list`, `run`                                                                                                                                                                             |
| `hs webhook`  | `list`, `get`, `create`, `delete`                                                                                                                                                         |
| `hs report`   | `company`, `user`, `conversations`                                                                                                                                                        |
| `hs api`      | Raw API escape hatch: `hs api GET /v2/conversations`                                                                                                                                      |
| `hs backup`   | Full account dump with incremental refresh, resume, deletion detection, attachments                                                                                                       |
| `hs profile`  | `list`, `use`, `current`                                                                                                                                                                  |
| `hs config`   | `get`, `set`, `list`                                                                                                                                                                      |
| `hs doctor`   | Diagnostic checks                                                                                                                                                                         |
| `hs version`  | Version info                                                                                                                                                                              |

Run `hs --help` or `hs <topic> --help` for details.

## Documentation

- [Authentication](docs/authentication.md) -- setup, login, profiles, CI/CD
- [Commands](docs/commands.md) -- full command reference
- [Configuration](docs/configuration.md) -- env vars, profiles, settings
- [API Reference](docs/api-reference.md) -- Help Scout endpoints used
- [Backup & Data Portability](docs/backup.md) -- `hs backup`, `hs conv dump`, `hs conv export --embed`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
