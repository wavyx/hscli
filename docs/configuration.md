# Configuration

## Config Hierarchy

hscli resolves configuration using standard 12-factor precedence. The first source with a value wins:

1. **CLI flags** -- `--mailbox 123`, `--output json`, `--profile work`
2. **Environment variables** -- `HSCLI_APP_ID`, `HSCLI_PROFILE`, `NO_COLOR`
3. **Profile config** -- per-profile settings in the config file
4. **Global config** -- top-level settings in the config file
5. **Built-in defaults** -- hardcoded defaults in the CLI

This means a flag always overrides an environment variable, which always overrides a profile config value, and so on.

## Environment Variables

| Variable           | Description                                                                                      | Default   |
| ------------------ | ------------------------------------------------------------------------------------------------ | --------- |
| `HSCLI_APP_ID`     | OAuth App ID for authentication                                                                  | --        |
| `HSCLI_APP_SECRET` | OAuth App Secret for authentication                                                              | --        |
| `HSCLI_AUTH_MODE`  | Set to `client_credentials` to use Client Credentials flow                                       | --        |
| `HSCLI_PROFILE`    | Profile name to use                                                                              | `default` |
| `NO_COLOR`         | Disable color output when set to any value                                                       | --        |
| `DEBUG`            | Enable debug logging. Use `hs:*` for all hscli logs, or narrow with `hs:auth`, `hs:client`, etc. | --        |

### CI/CD Example

```bash
export HSCLI_APP_ID=your-app-id
export HSCLI_APP_SECRET=your-app-secret
export HSCLI_AUTH_MODE=client_credentials
hscli auth login --client-credentials
hscli conv list --status active --output json
```

## Profile Management

Profiles let you maintain separate configurations and credentials for different Help Scout accounts.

### How Profiles Work

Each profile has:

- Its own OAuth credentials and tokens (stored in the OS keychain or encrypted file).
- Its own set of config key-value pairs (stored in the config file).

The **active profile** determines which credentials and config are used by default. It is stored in the global config file.

### Creating a Profile

Profiles are created implicitly when you log in with a profile name:

```bash
hscli auth login --profile work
hscli auth login --profile personal
```

### Switching Profiles

```bash
hscli profile use work
```

All subsequent commands use the `work` profile unless overridden.

### Listing Profiles

```bash
hscli profile list
```

Output marks the active profile with `*` and shows authentication status.

### Per-Command Override

Any command accepts `--profile <name>`:

```bash
hscli conv list --profile personal
```

Or use the environment variable:

```bash
HSCLI_PROFILE=personal hscli conv list
```

### Per-Profile Config

Set config values that apply only to a specific profile:

```bash
hscli profile use work
hscli config set default_output json
hscli config set page_size 50

hscli profile use personal
hscli config set default_output table
hscli config set page_size 25
```

## Config Keys

These keys can be set with `hscli config set <key> <value>` and read with `hscli config get <key>`:

| Key                | Description                                                               | Default                           |
| ------------------ | ------------------------------------------------------------------------- | --------------------------------- |
| `default_output`   | Default output format (`table` or `json`)                                 | `table` in TTY, `json` when piped |
| `page_size`        | Default number of results per page                                        | `25`                              |
| `timeout_ms`       | API request timeout in milliseconds                                       | `30000`                           |
| `oauth_app_id`     | OAuth App ID stored for this profile                                      | --                                |
| `oauth_app_secret` | OAuth App Secret stored for this profile                                  | --                                |
| `auth_mode`        | Auth mode for this profile (`authorization_code` or `client_credentials`) | --                                |
| `apiBase`          | API base URL (for testing or proxying)                                    | `https://api.helpscout.net/v2`    |

### Examples

```bash
hscli config set default_output json
hscli config set page_size 50
hscli config set timeout_ms 60000
hscli config list
```

## Config File Locations

hscli uses the [`conf`](https://github.com/sindresorhus/conf) library for config storage, which follows platform conventions:

| OS      | Config directory                                                |
| ------- | --------------------------------------------------------------- |
| macOS   | `~/Library/Preferences/hscli-nodejs/`                           |
| Linux   | `~/.config/hscli-nodejs/` (or `$XDG_CONFIG_HOME/hscli-nodejs/`) |
| Windows | `%APPDATA%\hscli-nodejs\`                                       |

The main config file is `config.json` inside this directory. It stores the active profile name and all per-profile configuration:

```json
{
  "activeProfile": "default",
  "profiles": {
    "default": {
      "oauth_app_id": "abc123",
      "auth_mode": "client_credentials",
      "default_output": "json",
      "page_size": 50
    },
    "work": {
      "oauth_app_id": "def456",
      "auth_mode": "authorization_code"
    }
  }
}
```

### Credential Storage

Tokens and secrets are **not** stored in the config file. They are stored separately:

- **OS Keychain** (preferred): macOS Keychain, Windows Credential Vault, or Linux libsecret via `@napi-rs/keyring`.
- **Encrypted file fallback**: `credentials.json` in the same config directory, encrypted by the `conf` library.

Run `hscli auth status` to see which storage backend is active and `hscli doctor` to verify the keychain is working.
