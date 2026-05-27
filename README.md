# hscli

CLI for [Help Scout](https://www.helpscout.com/) Inbox API 2.0.

## Install

```bash
npm install -g hscli
```

Requires Node.js 20+.

## Quick Start

```bash
hs auth setup              # Configure OAuth app (one-time)
hs auth login               # Authenticate
hs conv list                # List conversations
hs conv reply 123 --body "Thanks for reaching out"
hs customer create --email user@example.com --first Jane
```

## Commands

| Topic         | Commands                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `hs auth`     | `setup`, `login`, `logout`, `status`, `refresh`                                                               |
| `hs conv`     | `list`, `get`, `create`, `reply`, `note`, `status`, `assign`, `tag`, `move`, `delete`, `threads`, `edit-note` |
| `hs mailbox`  | `list`, `get`                                                                                                 |
| `hs user`     | `me`, `list`, `get`                                                                                           |
| `hs customer` | `create`, `update`, `list`, `get`, `search`, `conversations`                                                  |
| `hs tag`      | `list`, `get`                                                                                                 |
| `hs workflow` | `list`, `run`                                                                                                 |
| `hs webhook`  | `list`, `get`, `create`, `delete`                                                                             |
| `hs report`   | `company`, `user`, `conversations`                                                                            |
| `hs api`      | Raw API escape hatch: `hs api GET /v2/conversations`                                                          |
| `hs profile`  | `list`, `use`, `current`                                                                                      |
| `hs config`   | `get`, `set`, `list`                                                                                          |
| `hs doctor`   | Diagnostic checks                                                                                             |
| `hs version`  | Version info                                                                                                  |

Run `hs --help` or `hs <topic> --help` for details.

## Documentation

- [Authentication](docs/authentication.md) -- setup, login, profiles, CI/CD
- [Commands](docs/commands.md) -- full command reference
- [Configuration](docs/configuration.md) -- env vars, profiles, settings
- [API Reference](docs/api-reference.md) -- Help Scout endpoints used

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
