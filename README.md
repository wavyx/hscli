# hscli

CLI for [Help Scout](https://www.helpscout.com/) Inbox API 2.0. Query, automate, and integrate Help Scout from the terminal.

## Install

```bash
npm install -g hscli
```

Requires Node.js 20+.

## Quick Start

```bash
# Authenticate (opens browser)
hs auth login

# List active conversations
hs conv list

# Get a specific conversation
hs conv get 12345

# List mailboxes
hs mailbox list

# Check CLI health
hs doctor
```

## Authentication

hscli supports two OAuth2 flows:

**Authorization Code** (default, for humans):

```bash
hs auth login
```

**Client Credentials** (for CI/CD):

```bash
hs auth login --client-credentials --app-id $HS_APP_ID --app-secret $HS_APP_SECRET
```

Or via environment variables:

```bash
export HSCLI_APP_ID=your-app-id
export HSCLI_APP_SECRET=your-app-secret
export HSCLI_AUTH_MODE=client_credentials
hs auth login --client-credentials
```

### Embedded OAuth App

hscli ships with embedded OAuth credentials for zero-setup onboarding. These are intentionally public per [RFC 8252](https://datatracker.ietf.org/doc/html/rfc8252) (OAuth 2.0 for Native Apps). Security relies on loopback-only redirect URIs and CSRF state parameters, not client secret confidentiality.

For enterprise or security-conscious use, bring your own OAuth app:

```bash
hs auth login --app-id YOUR_ID --app-secret YOUR_SECRET
```

### Profiles

Manage multiple Help Scout accounts:

```bash
hs auth login --profile work
hs auth login --profile personal
hs profile use work
hs profile list
```

Tokens are stored in your OS keychain (macOS Keychain, Windows Credential Vault, Linux libsecret).

## Output Formats

Every command supports structured output:

```bash
# Table (default in terminal)
hs conv list

# JSON (default when piped)
hs conv list --output json

# Pipe to jq
hs conv list -o json | jq '.[].subject'

# Export to CSV (coming in v0.3)
hs conv list --since 30d --output csv > report.csv
```

## Commands

| Topic        | Commands                               |
| ------------ | -------------------------------------- |
| `hs auth`    | `login`, `logout`, `status`, `refresh` |
| `hs conv`    | `list`, `get`                          |
| `hs mailbox` | `list`, `get`                          |
| `hs user`    | `me`                                   |
| `hs profile` | `list`, `use`, `current`               |
| `hs config`  | `get`, `set`, `list`                   |
| `hs doctor`  | Diagnostic checks                      |
| `hs version` | Version info                           |

Run `hs --help` or `hs <topic> --help` for details.

## Configuration

Standard 12-factor precedence (highest wins):

1. CLI flags (`--mailbox 123`)
2. Environment variables (`HSCLI_MAILBOX=123`)
3. Profile config
4. Global config
5. Built-in defaults

```bash
hs config set default_output json
hs config set page_size 50
hs config list
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing, and commit conventions.

## License

MIT
