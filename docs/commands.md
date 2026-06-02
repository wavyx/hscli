# Command Reference

All commands support the following global flags:

| Flag             | Description                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| `--output`, `-o` | Output format: `table` (default in TTY) or `json` (default when piped) |
| `--profile`      | Named auth profile to use (overrides active profile)                   |
| `--no-color`     | Disable color output (also honors `NO_COLOR` env var)                  |
| `--verbose`      | Show detailed API request/response info on errors                      |

---

## Auth

Authentication and OAuth management.

### `hscli auth setup`

Configure your own Help Scout OAuth app. Opens a browser to Help Scout's My Apps page and walks through creating an app. Validates credentials against the API before saving.

```
USAGE
  hscli auth setup [--app-id <id> --app-secret <secret>]

FLAGS
  --app-id       OAuth app ID (skip interactive prompt; requires --app-secret)
  --app-secret   OAuth app secret (skip interactive prompt; requires --app-id)

EXAMPLES
  hscli auth setup
  hscli auth setup --app-id abc123 --app-secret xyz789
```

### `hscli auth login`

Authenticate with Help Scout. Uses Authorization Code flow by default (opens browser). Use `--client-credentials` for non-interactive CI/CD authentication.

```
USAGE
  hscli auth login [--client-credentials] [--app-id <id> --app-secret <secret>]

FLAGS
  --client-credentials   Use client credentials grant (no browser)
  --app-id               OAuth app ID (overrides profile/env)
  --app-secret           OAuth app secret (overrides profile/env)

EXAMPLES
  hscli auth login
  hscli auth login --client-credentials
  hscli auth login --app-id abc123 --app-secret xyz789
  hscli auth login --profile work
```

### `hscli auth logout`

Remove stored credentials for the active profile (or the profile specified with `--profile`).

```
USAGE
  hscli auth logout

EXAMPLES
  hscli auth logout
  hscli auth logout --profile work
```

### `hscli auth status`

Show the current authentication state: profile, keychain type, auth mode, token validity, and authenticated user info.

```
USAGE
  hscli auth status

EXAMPLES
  hscli auth status
```

### `hscli auth refresh`

Force-refresh the stored access token. Only works with Authorization Code sessions (requires a refresh token). Client Credentials sessions should re-authenticate with `hscli auth login`.

```
USAGE
  hscli auth refresh

EXAMPLES
  hscli auth refresh
```

---

## Conversations

Query, create, and manage Help Scout conversations.

### `hscli conv list`

List conversations with optional filters.

```
USAGE
  hscli conv list [--status <status>] [--mailbox <id>] [--tag <tag>] [--since <duration>]

FLAGS
  --mailbox       Filter by mailbox ID
  --status        Filter by status: active (default), pending, closed, spam, all
  --tag           Filter by tag name
  --assigned-to   Filter by assignee user ID
  --query         Search query
  --since         Modified since (ISO date or relative: 7d, 30d, 1h)
  --limit         Max results to return (default: 25)

EXAMPLES
  hscli conv list
  hscli conv list --status closed --mailbox 123
  hscli conv list --since 7d
  hscli conv list --query "billing issue"
```

### `hscli conv get`

Get a single conversation by ID, including thread details.

```
USAGE
  hscli conv get <id>

ARGUMENTS
  id   Conversation ID (required)

EXAMPLES
  hscli conv get 123
  hscli conv get 123 --output json
```

### `hscli conv create`

Create a new conversation.

```
USAGE
  hscli conv create --mailbox <id> --customer <email> --subject <text> --body <text>

FLAGS
  --mailbox      Mailbox ID (required)
  --customer     Customer email address (required)
  --subject      Conversation subject (required)
  --body         Message body: plain text, @filename to read from file, or pipe stdin
  --type         Conversation type: email (default), chat, phone
  --tag          Comma-separated tags to apply
  --assign-to    User ID to assign the conversation to

EXAMPLES
  hscli conv create --mailbox 1 --customer user@example.com --subject "Help" --body "Details"
  hscli conv create --mailbox 1 --customer user@example.com --subject "Chat" --type chat --body @message.txt
  hscli conv create --mailbox 1 --customer user@example.com --subject "Tagged" --body "Hi" --tag billing,urgent
```

### `hscli conv reply`

Reply to a conversation. The reply is sent to the customer.

```
USAGE
  hscli conv reply <id> --body <text>

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  --body    Reply body: plain text, @filename, or pipe stdin
  --cc      Comma-separated CC recipients
  --bcc     Comma-separated BCC recipients
  --draft   Save as draft without sending

EXAMPLES
  hscli conv reply 123 --body "Thanks for reaching out"
  hscli conv reply 123 --body @reply.txt --cc "manager@example.com"
  hscli conv reply 123 --body "Draft reply" --draft
```

### `hscli conv note`

Add an internal note to a conversation. Notes are not visible to the customer.

```
USAGE
  hscli conv note <id> --body <text>

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  --body   Note body: plain text, @filename, or pipe stdin

EXAMPLES
  hscli conv note 123 --body "Internal note about this ticket"
  hscli conv note 123 --body @notes.txt
```

### `hscli conv status`

Change the status of a conversation.

```
USAGE
  hscli conv status <id> --set <status>

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  --set   Status to set: active, pending, closed, spam (required)

EXAMPLES
  hscli conv status 123 --set closed
  hscli conv status 123 --set active
```

### `hscli conv assign`

Assign a conversation to a user.

```
USAGE
  hscli conv assign <id> --user <user>

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  --user   User ID to assign to, or "me" for the authenticated user (required)

EXAMPLES
  hscli conv assign 123 --user 456
  hscli conv assign 123 --user me
```

### `hscli conv tag`

Add or remove tags on a conversation. Fetches the current tags, applies changes, and sends the updated list.

```
USAGE
  hscli conv tag <id> [--add <tags>] [--remove <tags>]

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  --add      Comma-separated tags to add
  --remove   Comma-separated tags to remove

EXAMPLES
  hscli conv tag 123 --add billing,urgent
  hscli conv tag 123 --remove spam
  hscli conv tag 123 --add vip --remove low-priority
```

### `hscli conv move`

Move a conversation to a different mailbox.

```
USAGE
  hscli conv move <id> --to-mailbox <id>

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  --to-mailbox   Destination mailbox ID (required)

EXAMPLES
  hscli conv move 123 --to-mailbox 456
```

### `hscli conv delete`

Delete a conversation. Prompts for confirmation unless `--yes` is passed.

```
USAGE
  hscli conv delete <id> [--yes]

ARGUMENTS
  id   Conversation ID (required)

FLAGS
  -y, --yes   Skip confirmation prompt

EXAMPLES
  hscli conv delete 123
  hscli conv delete 123 --yes
```

---

## Mailboxes

List and inspect Help Scout mailboxes.

### `hscli mailbox list`

List all mailboxes.

```
USAGE
  hscli mailbox list [--limit <n>]

FLAGS
  --limit   Max results to return (default: 25)

EXAMPLES
  hscli mailbox list
  hscli mailbox list --limit 50
```

### `hscli mailbox get`

Get details for a single mailbox.

```
USAGE
  hscli mailbox get <id>

ARGUMENTS
  id   Mailbox ID (required)

EXAMPLES
  hscli mailbox get 123
```

---

## Users

### `hscli user me`

Show the currently authenticated user.

```
USAGE
  hscli user me

EXAMPLES
  hscli user me
  hscli user me --output json
```

---

## Customers

Create and update Help Scout customers.

### `hscli customer create`

Create a new customer.

```
USAGE
  hscli customer create --email <email> [--first <name>] [--last <name>]

FLAGS
  --email       Customer email address (required)
  --first       First name
  --last        Last name
  --company     Company / organization name
  --phone       Phone number
  --job-title   Job title

EXAMPLES
  hscli customer create --email user@example.com
  hscli customer create --email user@example.com --first Jane --last Doe --company Acme
  hscli customer create --email user@example.com --phone 555-1234 --job-title "Support Lead"
```

### `hscli customer update`

Update an existing customer using JSON Patch.

```
USAGE
  hscli customer update <id> [--email <email>] [--first <name>] [--last <name>]

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
  hscli customer update 42 --first Jane --last Doe
  hscli customer update 42 --email new@example.com --company Acme
  hscli customer update 42 --job-title "VP of Engineering"
```

---

## Profiles

Manage named authentication profiles for multiple Help Scout accounts.

### `hscli profile list`

List all configured profiles. The active profile is marked with `*`.

```
USAGE
  hscli profile list

EXAMPLES
  hscli profile list
```

### `hscli profile use`

Switch the active profile.

```
USAGE
  hscli profile use <name>

ARGUMENTS
  name   Profile name to activate (required)

EXAMPLES
  hscli profile use work
```

### `hscli profile current`

Print the name of the currently active profile.

```
USAGE
  hscli profile current

EXAMPLES
  hscli profile current
```

---

## Config

Read and write per-profile configuration values.

### `hscli config get`

Get a config value for the active profile.

```
USAGE
  hscli config get <key>

ARGUMENTS
  key   Config key to read (required)

EXAMPLES
  hscli config get default_output
  hscli config get page_size
```

### `hscli config set`

Set a config value for the active profile.

```
USAGE
  hscli config set <key> <value>

ARGUMENTS
  key     Config key to set (required)
  value   Value to assign (required)

EXAMPLES
  hscli config set default_output json
  hscli config set page_size 50
```

### `hscli config list`

List all config values for the active profile.

```
USAGE
  hscli config list

EXAMPLES
  hscli config list
```

---

## Diagnostics

### `hscli doctor`

Run diagnostic checks on the CLI environment. Checks config directory access, keychain availability, active profile, token presence and validity, and API reachability.

```
USAGE
  hscli doctor

EXAMPLES
  hscli doctor
```

### `hscli version`

Show CLI version, Node.js version, API base URL, and platform info.

```
USAGE
  hscli version

EXAMPLES
  hscli version
```

---

## Data Portability

See [docs/backup.md](backup.md) for the full guide.

### `hscli backup`

Full account backup with incremental refresh, resume, deletion detection, optional attachment downloads, and optional compression.

```
USAGE
  hscli backup --out <dir> [--full] [--resume] [--reconcile] [--keep-history]
            [--since DATE] [--include LIST] [--exclude LIST]
            [--attachments] [--compress] [--parallel N] [--dry-run]

EXAMPLES
  hscli backup --out ~/hs-backup
  hscli backup --out ~/hs-backup --reconcile --keep-history
  hscli backup --out ~/hs-backup --full --attachments --compress
  hscli backup --out ~/hs-backup --include conversations,customers
  hscli backup --out ~/hs-backup --dry-run
```

### `hscli conv dump <id>`

Dump a single conversation with threads, customers, tags, and attachment metadata as one self-contained JSON.

```
USAGE
  hscli conv dump <id> [--out FILE]

EXAMPLES
  hscli conv dump 3336043008 > conv-3336043008.json
  hscli conv dump 3336043008 --out conv-3336043008.json
```

### `hscli conv export --embed`

`hscli conv export` already supports bulk export to JSON/CSV/NDJSON. Pass `--embed threads` to include thread bodies inline via HAL `embed` query (single request per page). Only `threads` is supported by the Help Scout API on the conversations endpoint.

```
USAGE
  hscli conv export --embed threads --format json|ndjson

EXAMPLES
  hscli conv export --embed threads --format ndjson > full.ndjson
  hscli conv export --embed threads --status closed --format json
```

`--embed` is incompatible with `--format csv`.

---

## Beacon Utilities

See [docs/beacon.md](beacon.md) for the full guide including limitations.

### `hscli beacon sign`

Generate HMAC-SHA256 signature for Beacon Secure Mode.

```
USAGE
  hscli beacon sign --email <email> --secret <key>

EXAMPLES
  hscli beacon sign --email user@example.com --secret YOUR_KEY
  HSCLI_BEACON_SECRET=KEY hscli beacon sign --email user@example.com
```

### `hscli beacon verify`

Verify a signature. Exit 0 on match, exit 1 on mismatch.

```
USAGE
  hscli beacon verify --email <email> --secret <key> --signature <sig>
```

### `hscli beacon embed <beaconId>`

Generate `<script>` embed block for the Beacon widget.

```
USAGE
  hscli beacon embed <beaconId> [--color HEX] [--position left|right]
                              [--style icon|text|iconAndText|manual]
                              [--text "Help"] [--icon-image NAME]

EXAMPLES
  hscli beacon embed abc-123
  hscli beacon embed abc-123 --color "#5b21b6" --position right --style iconAndText --text Help
```

### `hscli beacon identify-snippet`

Generate server-side identify code with HMAC signing for the chosen stack.

```
USAGE
  hscli beacon identify-snippet --beacon-id <id> --secret <key>
                              [--stack node|rails|php|django|python]

EXAMPLES
  hscli beacon identify-snippet --beacon-id abc-123 --secret KEY
  hscli beacon identify-snippet --beacon-id abc-123 --secret KEY --stack rails
```

### `hscli report beacon`

Aggregate conversation counts by `source.type`/`source.via`. Useful as a Beacon-origin proxy since Help Scout does not expose Beacon analytics via API.

```
USAGE
  hscli report beacon [--since 30d|2024-01-01T00:00:00Z] [--mailbox ID]

EXAMPLES
  hscli report beacon --since 7d
  hscli report beacon --since 30d --mailbox 42 --output json
```

### `hscli conv list --source <type>` and `hscli conv export --source <type>`

Filter conversations by `source.type`. Client-side filter (Help Scout API does
not support source as a query param). Valid values: `api`, `beacon`, `channel`,
`chat`, `consumer`, `coreapi`, `customer`, `email`.
