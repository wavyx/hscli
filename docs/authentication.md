# Authentication

hscli uses OAuth 2.0 to authenticate with the Help Scout API. Two grant types are supported: **Authorization Code** (interactive, for humans) and **Client Credentials** (non-interactive, for CI/CD and service accounts).

## First-Run Setup

Before using the CLI you need to create an OAuth application in Help Scout. The `hscli auth setup` wizard walks you through this.

### Interactive Setup

```bash
hscli auth setup
```

The wizard will:

1. Open your browser to **My Profile > My Apps** in Help Scout.
2. Prompt you to create an app with the redirect URL `http://127.0.0.1:9999/callback`.
3. Ask you to paste the App ID and App Secret.
4. Validate the credentials against the Help Scout API.
5. Store the App ID in your profile config and the tokens in your OS keychain.

### Non-Interactive Setup

Pass credentials directly via flags to skip the interactive prompts:

```bash
hscli auth setup --app-id <id> --app-secret <secret>
```

Both `--app-id` and `--app-secret` must be provided together.

## Creating a Help Scout OAuth App

Help Scout OAuth applications are **account-scoped** -- each user creates their own app under their Help Scout account.

1. Log in to [Help Scout](https://secure.helpscout.net/).
2. Go to **My Profile > My Apps** (bottom of the profile page).
3. Click **Create My App**.
4. Fill in the form:
   - **App Name:** anything you like (e.g. "hscli").
   - **Redirection URL:** `http://127.0.0.1:9999/callback`
5. Click **Create Application**.
6. Copy the **App ID** and **App Secret** -- you will need them for `hscli auth setup` or `hscli auth login`.

## Logging In

### Authorization Code Flow (Default)

Opens a browser window for interactive authentication. Best for personal use.

```bash
hscli auth login
```

How it works:

1. The CLI resolves OAuth credentials (from flags, env vars, or profile config).
2. A local HTTP server starts on `127.0.0.1:9999` (the port registered as the app's Redirection URL).
3. Your browser opens the Help Scout authorization page.
4. You click **Allow** in the Help Scout UI.
5. Help Scout redirects to the local server with an authorization code.
6. The CLI exchanges the code for an access token and refresh token.
7. Tokens are stored in your OS keychain.
8. The access token auto-refreshes on 401 responses using the refresh token.

You can pass explicit credentials to override what is stored in your profile:

```bash
hscli auth login --app-id <id> --app-secret <secret>
```

### Client Credentials Flow

Authenticates without a browser. Best for CI/CD pipelines and service accounts.

```bash
hscli auth login --client-credentials --app-id <id> --app-secret <secret>
```

Or via environment variables:

```bash
export HSCLI_APP_ID=your-app-id
export HSCLI_APP_SECRET=your-app-secret
hscli auth login --client-credentials
```

This flow does not produce a refresh token. When the token expires (48 hours), the CLI automatically re-authenticates using the stored client credentials.

## Profiles

Profiles let you manage multiple Help Scout accounts or configurations without re-authenticating.

### Log in to a Named Profile

```bash
hscli auth login --profile work
hscli auth login --profile personal
```

### Switch the Active Profile

```bash
hscli profile use work
```

All subsequent commands use the active profile unless overridden with `--profile <name>`.

### List Profiles

```bash
hscli profile list
```

Shows all configured profiles. The active profile is marked with `*`. Authenticated profiles show `(authenticated)`.

### Show the Active Profile

```bash
hscli profile current
```

### Override Per-Command

Any command accepts `--profile <name>` to use a different profile for that invocation:

```bash
hscli conv list --profile personal
```

You can also set the profile via the `HSCLI_PROFILE` environment variable.

## Environment Variables for CI/CD

For non-interactive environments, configure authentication entirely through environment variables:

| Variable           | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `HSCLI_APP_ID`     | OAuth App ID                                         |
| `HSCLI_APP_SECRET` | OAuth App Secret                                     |
| `HSCLI_AUTH_MODE`  | Set to `client_credentials` to skip the browser flow |
| `HSCLI_PROFILE`    | Profile name to use (default: `default`)             |

### Example: GitHub Actions

```yaml
env:
  HSCLI_APP_ID: ${{ secrets.HELPSCOUT_APP_ID }}
  HSCLI_APP_SECRET: ${{ secrets.HELPSCOUT_APP_SECRET }}
  HSCLI_AUTH_MODE: client_credentials

steps:
  - run: npm install -g hscli
  - run: hscli auth login --client-credentials
  - run: hscli conv list --status active --output json
```

## Token Storage

Tokens are stored securely using a two-tier strategy:

1. **OS Keychain** (preferred) -- uses [`@napi-rs/keyring`](https://github.com/nicola-corp/keyring-rs) to store tokens in macOS Keychain, Windows Credential Vault, or Linux libsecret.
2. **Encrypted file fallback** -- if the OS keychain is unavailable (e.g. headless servers, containers), tokens are stored in an encrypted file via the `conf` library at the platform-appropriate config directory.

Tokens are stored under the key `hscli/<profile>/tokens` and include the access token, refresh token (if applicable), expiry timestamp, auth mode, and credential source.

Run `hscli auth status` to see which storage backend is in use.

## Auth Commands

### `hscli auth setup`

Configure your own Help Scout OAuth app. Validates credentials against the API before saving.

```bash
hscli auth setup                                     # Interactive wizard
hscli auth setup --app-id <id> --app-secret <secret>  # Non-interactive
```

### `hscli auth login`

Authenticate with Help Scout.

```bash
hscli auth login                              # Authorization Code (opens browser)
hscli auth login --client-credentials          # Client Credentials (no browser)
hscli auth login --app-id <id> --app-secret <secret>  # Explicit credentials
hscli auth login --profile work               # Log in to a specific profile
```

### `hscli auth status`

Show the current authentication state: profile, keychain type, auth mode, token expiry, and authenticated user info.

```bash
hscli auth status
```

### `hscli auth refresh`

Force-refresh the stored access token. Only works with Authorization Code sessions that have a refresh token. Client Credentials sessions should use `hscli auth login` to re-authenticate.

```bash
hscli auth refresh
```

### `hscli auth logout`

Remove stored credentials for the active profile.

```bash
hscli auth logout
hscli auth logout --profile work
```
