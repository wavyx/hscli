# Command Reference

All commands support the following global flags:

| Flag | Description |
|---|---|
| `--output`, `-o` | Output format: `table` (default in TTY) or `json` (default when piped) |
| `--profile` | Named auth profile to use (overrides active profile) |
| `--no-color` | Disable color output (also honors `NO_COLOR` env var) |
| `--verbose` | Show detailed API request/response info on errors |

---

## Auth

Authentication and OAuth management.

### `hs auth setup`

Configure your own Help Scout OAuth app. Opens a browser to Help Scout's My Apps page and walks through creating an app. Validates credentials against the API before saving.

```
USAGE
  hs auth setup [--app-id <id> --app-secret <secret>]

FLAGS
  --app-id       OAuth app ID (skip interactive prompt; requires --app-secret)
  --app-secret   OAuth app secret (skip interactive prompt; requires --app-id)

EXAMPLES
  hs auth setup
  hs auth setup --app-id abc123 --app-secret xyz789
```

### `hs auth login`

Authenticate with Help Scout. Uses Authorization Code flow by default (opens browser). Use `--client-credentials` for non-interactive CI/CD authentication.

```
USAGE
  hs auth login [--client-credentials] [--app-id <id> --app-secret <secret>]

FLAGS
  --client-credentials   Use client credentials grant (no browser)
  --app-id               OAuth app ID (overrides profile/env)
  --app-secret           OAuth app secret (overrides profile/env)

EXAMPLES
  hs auth login
  hs auth login --client-credentials
  hs auth login --app-id abc123 --app-secret xyz789
  hs auth login --profile work
```

### `hs auth logout`

Remove stored credentials for the active profile (or the profile specified with `--profile`).

```
USAGE
  hs auth logout

EXAMPLES
  hs auth logout
  hs auth logout --profile work
```

### `hs auth status`

Show the current authentication state: profile, keychain type, auth mode, token validity, and authenticated user info.

```
USAGE
  hs auth status

EXAMPLES
  hs auth status
```

### `hs auth refresh`

Force-refresh the stored access token. Only works with Authorization Code sessions (requires a refresh token). Client Credentials sessions should re-authenticate with `hs auth login`.

```
USAGE
  hs auth refresh

EXAMPLES
  hs auth refresh
```

---

## Conversations

Query, create, and manage Help Scout conversations.

### `hs conv list`

List conversations with optional filters.

```
USAGE
  hs conv list [--status <status>] [--mailbox <id>] [--tag <tag>] [--since <duration>]

FLAGS
  --mailbox       Filter by mailbox ID
  --status        Filter by status: active (default), pending, closed, spam, all
  --tag           Filter by tag name
  --assigned-to   Filter by assignee user ID
  --query         Search query
  --since         Modified since (ISO date or relative: 7d, 30d, 1h)
  --limit         Max results to return (default: 25)

EXAMPLES
  hs conv list
  hs conv list --status closed --mailbox 123
  hs conv list --since 7d
  hs conv list --query "billing issue"
```

### `hs conv get`

Get a single conversation by ID, including thread details.

```
USAGE
  hs conv get <id>

ARGUMENTS
  id   Conversation ID (required)

EXAMPLES
  hs conv get 123
  hs conv get 123 --output json
```

### `hs conv create`

Create a new conversation.

```
USAGE
  hs conv create --mailbox <id> --customer <email> --subject <text> --body <text>

FLAGS
  --mailbox      Mailbox ID (required)
  --customer     Customer email address (required)
  --subject      Conversation subject (required)
  --body         Message body: plain text, @filename to read from file, or pipe stdin
  --type         Conversation type: email (default), chat, phone
  --tag          Comma-separated tags to apply
  --assign-to    User ID to assign the conversation to

EXAMPLES
  hs conv create --mailbox 1 --customer user@example.com --subject "Help" --body "Details"
  hs conv create --mailbox 1 --customer user@example.com --subject "Chat" --type chat --body @message.txt
  hs conv create --mailbox 1 --customer user@example.com --subject "Tagged" --body "Hi" --tag billing,urgent
```

### `hs conv reply`

Reply to a conversation. The reply is sent to the customer.

```
USAGE
  hs conv reply <id> --body <text>

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  --body    Reply body: plain text, @filename, or pipe stdin
  --cc      Comma-separated CC recipients
  --bcc     Comma-separated BCC recipients
  --draft   Save as draft without sending

EXAMPLES
  hs conv reply 123 --body "Thanks for reaching out"
  hs conv reply 123 --body @reply.txt --cc "manager@example.com"
  hs conv reply 123 --body "Draft reply" --draft
```

### `hs conv note`

Add an internal note to a conversation. Notes are not visible to the customer.

```
USAGE
  hs conv note <id> --body <text>

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  --body   Note body: plain text, @filename, or pipe stdin

EXAMPLES
  hs conv note 123 --body "Internal note about this ticket"
  hs conv note 123 --body @notes.txt
```

### `hs conv status`

Change the status of a conversation.

```
USAGE
  hs conv status <id> --set <status>

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  --set   Status to set: active, pending, closed, spam (required)

EXAMPLES
  hs conv status 123 --set closed
  hs conv status 123 --set active
```

### `hs conv assign`

Assign a conversation to a user.

```
USAGE
  hs conv assign <id> --user <user>

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  --user   User ID to assign to, or "me" for the authenticated user (required)

EXAMPLES
  hs conv assign 123 --user 456
  hs conv assign 123 --user me
```

### `hs conv tag`

Add or remove tags on a conversation. Fetches the current tags, applies changes, and sends the updated list.

```
USAGE
  hs conv tag <id> [--add <tags>] [--remove <tags>]

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  --add      Comma-separated tags to add
  --remove   Comma-separated tags to remove

EXAMPLES
  hs conv tag 123 --add billing,urgent
  hs conv tag 123 --remove spam
  hs conv tag 123 --add vip --remove low-priority
```

### `hs conv move`

Move a conversation to a different mailbox.

```
USAGE
  hs conv move <id> --to-mailbox <id>

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  --to-mailbox   Destination mailbox ID (required)

EXAMPLES
  hs conv move 123 --to-mailbox 456
```

### `hs conv delete`

Delete a conversation. Prompts for confirmation unless `--yes` is passed.

```
USAGE
  hs conv delete <id> [--yes]

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  -y, --yes   Skip confirmation prompt

EXAMPLES
  hs conv delete 123
  hs conv delete 123 --yes
```

---

## Mailboxes

List and inspect Help Scout mailboxes.

### `hs mailbox list`

List all mailboxes.

```
USAGE
  hs mailbox list [--limit <n>]

FLAGS
  --limit   Max results to return (default: 25)

EXAMPLES
  hs mailbox list
  hs mailbox list --limit 50
```

### `hs mailbox get`

Get details for a single mailbox.

```
USAGE
  hs mailbox get <id>

ARGUMENTS
  id   Mailbox ID (required)

EXAMPLES
  hs mailbox get 123
```

---

## Users

### `hs user me`

Show the currently authenticated user.

```
USAGE
  hs user me

EXAMPLES
  hs user me
  hs user me --output json
```

---

## Customers

Create and update Help Scout customers.

### `hs customer create`

Create a new customer.

```
USAGE
  hs customer create --email <email> [--first <name>] [--last <name>]

FLAGS
  --email       Customer email address (required)
  --first       First name
  --last        Last name
  --company     Company / organization name
  --phone       Phone number
  --job-title   Job title

EXAMPLES
  hs customer create --email user@example.com
  hs customer create --email user@example.com --first Jane --last Doe --company Acme
  hs customer create --email user@example.com --phone 555-1234 --job-title "Support Lead"
```

### `hs customer update`

Update an existing customer using JSON Patch.

```
USAGE
  hs customer update <id> [--email <email>] [--first <name>] [--last <name>]

ARGUMENTS
  id   Customer ID (required)

FLAGS
  --email       Customer email address
  --first       First name
  --last        Last name
  --company     Company / organization name
  --phone       Phone number
  --job-title   Job title

EXAMPLES
  hs customer update 42 --first Jane --last Doe
  hs customer update 42 --email new@example.com --company Acme
  hs customer update 42 --job-title "VP of Engineering"
```

---

## Profiles

Manage named authentication profiles for multiple Help Scout accounts.

### `hs profile list`

List all configured profiles. The active profile is marked with `*`.

```
USAGE
  hs profile list

EXAMPLES
  hs profile list
```

### `hs profile use`

Switch the active profile.

```
USAGE
  hs profile use <name>

ARGUMENTS
  name   Profile name to activate (required)

EXAMPLES
  hs profile use work
```

### `hs profile current`

Print the name of the currently active profile.

```
USAGE
  hs profile current

EXAMPLES
  hs profile current
```

---

## Config

Read and write per-profile configuration values.

### `hs config get`

Get a config value for the active profile.

```
USAGE
  hs config get <key>

ARGUMENTS
  key   Config key to read (required)

EXAMPLES
  hs config get default_output
  hs config get page_size
```

### `hs config set`

Set a config value for the active profile.

```
USAGE
  hs config set <key> <value>

ARGUMENTS
  key     Config key to set (required)
  value   Value to assign (required)

EXAMPLES
  hs config set default_output json
  hs config set page_size 50
```

### `hs config list`

List all config values for the active profile.

```
USAGE
  hs config list

EXAMPLES
  hs config list
```

---

## Diagnostics

### `hs doctor`

Run diagnostic checks on the CLI environment. Checks config directory access, keychain availability, active profile, token presence and validity, and API reachability.

```
USAGE
  hs doctor

EXAMPLES
  hs doctor
```

### `hs version`

Show CLI version, Node.js version, API base URL, and platform info.

```
USAGE
  hs version

EXAMPLES
  hs version
```
