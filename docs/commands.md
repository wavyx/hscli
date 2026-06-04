---
title: Commands
description: Full command reference for the hscli command-line interface.
---

<!-- AUTO-GENERATED from the oclif manifest by scripts/gen-commands.mjs — do not edit by hand. -->

Reference for `hscli` v0.8.1 (88 commands). Every command also accepts the global flags `--output table|json|yaml|csv`, `--jq`, `--fields`, `--profile`, `--no-color`, `--verbose`, `--no-retry`, and `--timeout`.

## Top-level

### `hscli api`

Make a raw API request

```
hscli api <method> <path> [flags]
```

- `--body <value>` — Request body (JSON string, @file, or pipe stdin)
- `--content-type <value>` — Content-Type header

Examples:

```bash
hscli api GET /v2/conversations
hscli api POST /v2/conversations --body '{"subject":"test"}'
hscli api DELETE /v2/webhooks/1
```

### `hscli backup`

Full account backup with incremental refresh, resume, deletion detection, attachment downloads, and optional compression

```
hscli backup [flags]
```

- `--out <value>` _(required)_ — Target output directory
- `--full` — Force full re-sync, ignore manifest lastSyncedAt
- `--resume` — Continue interrupted run from checkpoint
- `--reconcile` — After fetch, ID-scan to detect deletions (writes tombstones)
- `--keep-history` — Append delta log to _history/
- `--since <value>` — Override lastSyncedAt (ISO date or relative: 7d, 30d, 1h)
- `--include <value>` — CSV resource subset
- `--exclude <value>` — CSV resource exclusion
- `--attachments` — Download attachment binaries (immutable, skips existing)
- `--compress` — Final tar.gz step (incompatible with future incremental on same dir)
- `--parallel <value>` — Concurrent attachment downloads
- `--dry-run` — Show plan, no writes

Examples:

```bash
hscli backup --out ~/hs-backup
hscli backup --out ~/hs-backup --reconcile --keep-history
hscli backup --out ~/hs-backup --full --attachments --compress
hscli backup --out ~/hs-backup --include conversations,customers
hscli backup --out ~/hs-backup --dry-run
```

### `hscli doctor`

Run diagnostic checks on the CLI environment

```
hscli doctor [flags]
```

Examples:

```bash
hscli doctor
```

### `hscli version`

Show CLI version and environment info

```
hscli version [flags]
```

Examples:

```bash
hscli version
```

## hscli alias

### `hscli alias list`

List all configured aliases

```
hscli alias list [flags]
```

Examples:

```bash
hscli alias list
```

### `hscli alias set`

Create or update an alias

```
hscli alias set <name> <command> [flags]
```

Examples:

```bash
hscli alias set ll "conv list --limit 50"
hscli alias set inbox "conv list --mailbox 42 --status active"
```

### `hscli alias unset`

Remove an alias

```
hscli alias unset <name> [flags]
```

Examples:

```bash
hscli alias unset ll
```

## hscli auth

### `hscli auth login`

Authenticate with Help Scout

```
hscli auth login [flags]
```

- `--client-credentials` — Use client credentials grant (no browser)
- `--app-id <value>` — OAuth app ID (overrides profile/env)
- `--app-secret <value>` — OAuth app secret (overrides profile/env)

Examples:

```bash
hscli auth login
hscli auth login --client-credentials
hscli auth login --app-id <id> --app-secret <secret>
```

### `hscli auth logout`

Log out and remove stored credentials

```
hscli auth logout [flags]
```

Examples:

```bash
hscli auth logout
```

### `hscli auth refresh`

Force-refresh the stored access token

```
hscli auth refresh [flags]
```

Examples:

```bash
hscli auth refresh
```

### `hscli auth setup`

Configure your own Help Scout OAuth app

```
hscli auth setup [flags]
```

- `--app-id <value>` — OAuth app ID (skip prompt)
- `--app-secret <value>` — OAuth app secret (skip prompt)

Examples:

```bash
hscli auth setup
hscli auth setup --app-id <id> --app-secret <secret>
```

### `hscli auth status`

Show current authentication status

```
hscli auth status [flags]
```

Examples:

```bash
hscli auth status
```

## hscli beacon

### `hscli beacon embed`

Generate the <script> embed block to add a Beacon to your website

```
hscli beacon embed <beaconId> [flags]
```

- `--color <value>` — Hex color (e.g. #5b21b6)
- `--position <left|right>` — Button position
- `--style <icon|text|iconAndText|manual>` — Button style
- `--text <value>` — Button text (for text/iconAndText)
- `--icon-image <message|beacon|search|buoy|question>` — Icon variant

Examples:

```bash
hscli beacon embed BEACON_ID
hscli beacon embed BEACON_ID --color "#5b21b6" --position right
hscli beacon embed BEACON_ID --style iconAndText --text "Help"
```

### `hscli beacon identify-snippet`

Generate server-side identify snippet with HMAC signing for node, rails, php, django, python

```
hscli beacon identify-snippet [flags]
```

- `--beacon-id <value>` _(required)_ — Beacon ID
- `--secret <value>` _(required)_ — Beacon secret key
- `--stack <node|rails|php|django|python>` — Server-side stack

Examples:

```bash
hscli beacon identify-snippet --beacon-id BEACON_ID --secret KEY
hscli beacon identify-snippet --beacon-id BEACON_ID --secret KEY --stack rails
```

### `hscli beacon sign`

Generate Beacon Secure Mode HMAC-SHA256 signature for an email

```
hscli beacon sign [flags]
```

- `--email <value>` _(required)_ — Customer email address to sign
- `--secret <value>` _(required)_ — Beacon secret key (from Beacon settings → Contact tab)

Examples:

```bash
hscli beacon sign --email user@example.com --secret YOUR_KEY
hscli beacon sign --email user@example.com --secret YOUR_KEY --output json
```

### `hscli beacon verify`

Verify a Beacon Secure Mode HMAC signature (exit 0 on match, exit 1 on mismatch)

```
hscli beacon verify [flags]
```

- `--email <value>` _(required)_ — Customer email
- `--secret <value>` _(required)_ — Beacon secret key
- `--signature <value>` _(required)_ — Signature to verify

Examples:

```bash
hscli beacon verify --email user@example.com --secret KEY --signature SIG
```

## hscli config

### `hscli config get`

Get a config value for the active profile

```
hscli config get <key> [flags]
```

Examples:

```bash
hscli config get apiBase
hscli config get clientId
```

### `hscli config list`

List all config for the active profile

```
hscli config list [flags]
```

Examples:

```bash
hscli config list
```

### `hscli config set`

Set a config value for the active profile

```
hscli config set <key> <value> [flags]
```

Examples:

```bash
hscli config set apiBase https://api.helpscout.net
hscli config set output json
```

### `hscli config validate`

Validate CLI configuration

```
hscli config validate [flags]
```

Examples:

```bash
hscli config validate
```

## hscli conv

### `hscli conv assign`

Assign a conversation to a user

```
hscli conv assign <id> [flags]
```

- `--user <value>` _(required)_ — User ID to assign to, or "me" for the authenticated user

Examples:

```bash
hscli conv assign 123 --user 456
hscli conv assign 123 --user me
```

### `hscli conv attachments`

List attachments for a conversation

```
hscli conv attachments <id> [flags]
```

Examples:

```bash
hscli conv attachments 123
hscli conv attachments 123 --output json
```

### `hscli conv bulk-status`

Batch change status on multiple conversations

```
hscli conv bulk-status [flags]
```

- `--mailbox <value>` — Filter by mailbox ID
- `--status <value>` — Filter by current status
- `--tag <value>` — Filter by tag
- `--set <active|pending|closed|spam>` _(required)_ — Status to set
- `--limit <value>` — Max conversations to update
- `-y, --yes` — Skip confirmation prompt

Examples:

```bash
hscli conv bulk-status --status active --set closed
hscli conv bulk-status --mailbox 42 --set pending --yes
hscli conv bulk-status --tag vip --set active --limit 50
```

### `hscli conv count`

Count conversations

```
hscli conv count [flags]
```

- `--status <active|pending|closed|spam|all>` — Filter by status
- `--mailbox <value>` — Filter by mailbox ID
- `--tag <value>` — Filter by tag

Examples:

```bash
hscli conv count
hscli conv count --status active
hscli conv count --mailbox 123 --tag billing
```

### `hscli conv create`

Create a new conversation

```
hscli conv create [flags]
```

- `--mailbox <value>` _(required)_ — Mailbox ID
- `--customer <value>` _(required)_ — Customer email address
- `--subject <value>` _(required)_ — Conversation subject
- `--body <value>` — Message body (text, @file, or pipe stdin)
- `--type <email|chat|phone>` — Conversation type
- `--tag <value>` — Comma-separated tags
- `--assign-to <value>` — User ID to assign to

Examples:

```bash
hscli conv create --mailbox 1 --customer user@example.com --subject "Help needed" --body "Details here"
hscli conv create --mailbox 1 --customer user@example.com --subject "Chat" --type chat --body @message.txt
hscli conv create --mailbox 1 --customer user@example.com --subject "Tagged" --body "Hi" --tag billing,urgent
```

### `hscli conv delete`

Delete a conversation

```
hscli conv delete <id> [flags]
```

- `-y, --yes` — Skip confirmation prompt

Examples:

```bash
hscli conv delete 123
hscli conv delete 123 --yes
```

### `hscli conv dump`

Dump a single conversation with threads, customers, tags, and attachment metadata

```
hscli conv dump <id> [flags]
```

- `--out <value>` — Write JSON dump to file instead of stdout

Examples:

```bash
hscli conv dump 123 > conv-123.json
hscli conv dump 123 --out conv-123.json
```

### `hscli conv edit-note`

Edit a note or thread body

```
hscli conv edit-note <id> <threadId> [flags]
```

- `--body <value>` — New body text (text, @file, or pipe stdin)

Examples:

```bash
hscli conv edit-note 123 456 --body "Updated note"
hscli conv edit-note 123 456 --body @updated.txt
```

### `hscli conv export`

Bulk export conversations

```
hscli conv export [flags]
```

- `--mailbox <value>` — Filter by mailbox ID
- `--status <active|pending|closed|spam|all>` — Filter by status
- `--since <value>` — Modified since (ISO date or relative: 7d, 30d, 1h)
- `--format <json|csv|ndjson>` — Output format
- `--tag <value>` — Filter by tag
- `--embed <value>` — Embed related resources (csv: threads)
- `--source <value>` — Filter by source.type (client-side post-fetch): api, beacon, channel, chat, consumer, coreapi, customer, email

Examples:

```bash
hscli conv export --format json > data.json
hscli conv export --mailbox 42 --format csv > report.csv
hscli conv export --since 30d --format ndjson
hscli conv export --status closed --tag vip
```

### `hscli conv get`

Get a conversation by ID

```
hscli conv get <id> [flags]
```

Examples:

```bash
hscli conv get 123
hscli conv get 123 --output json
```

### `hscli conv list`

List conversations

```
hscli conv list [flags]
```

- `--mailbox <value>` — Filter by mailbox ID
- `--status <active|pending|closed|spam|all>` — Filter by status
- `--tag <value>` — Filter by tag
- `--assigned-to <value>` — Filter by assignee (user ID)
- `--query <value>` — Search query
- `--since <value>` — Modified since (ISO date or relative: 7d, 30d, 1h)
- `--limit <value>` — Max results to return
- `--source <value>` — Filter by source.type (client-side post-fetch): api, beacon, channel, chat, consumer, coreapi, customer, email

Examples:

```bash
hscli conv list
hscli conv list --status closed --mailbox 123
hscli conv list --since 7d
hscli conv list --query "billing issue"
```

### `hscli conv move`

Move a conversation to another mailbox

```
hscli conv move <id> [flags]
```

- `--to-mailbox <value>` _(required)_ — Destination mailbox ID

Examples:

```bash
hscli conv move 123 --to-mailbox 456
```

### `hscli conv note`

Add a note to a conversation

```
hscli conv note <id> [flags]
```

- `--body <value>` — Note body (text, @file, or pipe stdin)

Examples:

```bash
hscli conv note 123 --body "Internal note about this ticket"
hscli conv note 123 --body @notes.txt
```

### `hscli conv reply`

Reply to a conversation

```
hscli conv reply <id> [flags]
```

- `--body <value>` — Reply body (text, @file, or pipe stdin)
- `--cc <value>` — Comma-separated CC recipients
- `--bcc <value>` — Comma-separated BCC recipients
- `--draft` — Save as draft

Examples:

```bash
hscli conv reply 123 --body "Thanks for reaching out"
hscli conv reply 123 --body @reply.txt --cc "manager@example.com"
hscli conv reply 123 --body "Draft reply" --draft
```

### `hscli conv search`

Search conversations

```
hscli conv search <query> [flags]
```

- `--mailbox <value>` — Filter by mailbox ID
- `--limit <value>` — Max results to return

Examples:

```bash
hscli conv search "billing issue"
hscli conv search "refund" --mailbox 123
hscli conv search "api" --limit 10
```

### `hscli conv status`

Change conversation status

```
hscli conv status <id> [flags]
```

- `--set <active|pending|closed|spam>` _(required)_ — Status to set

Examples:

```bash
hscli conv status 123 --set closed
hscli conv status 123 --set active
```

### `hscli conv tag`

Update tags on a conversation

```
hscli conv tag <id> [flags]
```

- `--add <value>` — Comma-separated tags to add
- `--remove <value>` — Comma-separated tags to remove

Examples:

```bash
hscli conv tag 123 --add billing,urgent
hscli conv tag 123 --remove spam
hscli conv tag 123 --add vip --remove low-priority
```

### `hscli conv threads`

List threads of a conversation

```
hscli conv threads <id> [flags]
```

Examples:

```bash
hscli conv threads 123
```

### `hscli conv watch`

Live tail of conversations (poll-based)

```
hscli conv watch [flags]
```

- `--mailbox <value>` — Filter by mailbox ID
- `--status <value>` — Filter by status
- `--poll <value>` — Seconds between polls
- `--limit <value>` — Max conversations per poll
- `--once` — Exit after first poll
- `--max-polls <value>` — Maximum number of polls before exiting

Examples:

```bash
hscli conv watch
hscli conv watch --mailbox 42 --poll 10
hscli conv watch --status pending --limit 5
```

## hscli customer

### `hscli customer conversations`

List conversations for a customer

```
hscli customer conversations <id> [flags]
```

- `--limit <value>` — Max results to return

Examples:

```bash
hscli customer conversations 123
hscli customer conversations 123 --limit 10
```

### `hscli customer create`

Create a new customer

```
hscli customer create [flags]
```

- `--email <value>` _(required)_ — Customer email address
- `--first <value>` — First name
- `--last <value>` — Last name
- `--company <value>` — Company / organization name
- `--phone <value>` — Phone number
- `--job-title <value>` — Job title

Examples:

```bash
hscli customer create --email user@example.com
hscli customer create --email user@example.com --first Jane --last Doe --company Acme
hscli customer create --email user@example.com --phone 555-1234 --job-title "Support Lead"
```

### `hscli customer get`

Get a customer by ID

```
hscli customer get <id> [flags]
```

Examples:

```bash
hscli customer get 123
```

### `hscli customer list`

List customers

```
hscli customer list [flags]
```

- `--mailbox <value>` — Filter by mailbox ID
- `--first <value>` — Filter by first name
- `--last <value>` — Filter by last name
- `--since <value>` — Modified since (ISO date or relative: 7d, 30d, 1h)
- `--limit <value>` — Max results to return

Examples:

```bash
hscli customer list
hscli customer list --mailbox 42
hscli customer list --since 7d
```

### `hscli customer search`

Search customers

```
hscli customer search <query> [flags]
```

- `--limit <value>` — Max results to return

Examples:

```bash
hscli customer search "john"
hscli customer search "acme" --limit 10
```

### `hscli customer update`

Update a customer

```
hscli customer update <id> [flags]
```

- `--email <value>` — Customer email address
- `--first <value>` — First name
- `--last <value>` — Last name
- `--company <value>` — Company / organization name
- `--phone <value>` — Phone number
- `--job-title <value>` — Job title

Examples:

```bash
hscli customer update 42 --first Jane --last Doe
hscli customer update 42 --email new@example.com --company Acme
hscli customer update 42 --job-title "VP of Engineering"
```

## hscli docs

### `hscli docs article create`

Create a Docs article

```
hscli docs article create [flags]
```

- `--collection <value>` _(required)_ — Collection id
- `--name <value>` _(required)_ — Article name (unique within the collection)
- `--text <value>` _(required)_ — Article body — text/HTML, or @file
- `--status <published|notpublished>` — Article status
- `--slug <value>` — SEO slug (auto-generated if omitted)
- `--categories <value>` — Comma-separated category ids
- `--keywords <value>` — Comma-separated keywords

Examples:

```bash
hscli docs article create --collection <id> --name "Title" --text "<p>Body</p>"
hscli docs article create --collection <id> --name "Title" --text @article.html --status published
```

### `hscli docs article delete`

Delete a Docs article

```
hscli docs article delete <id> [flags]
```

- `-y, --yes` — Skip confirmation prompt

Examples:

```bash
hscli docs article delete <id>
hscli docs article delete <id> --yes
```

### `hscli docs article delete-draft`

Discard the draft of a Docs article (published text is kept)

```
hscli docs article delete-draft <id> [flags]
```

- `-y, --yes` — Skip confirmation prompt

Examples:

```bash
hscli docs article delete-draft <id>
hscli docs article delete-draft <id> --yes
```

### `hscli docs article get`

Get a Docs article by id or number

```
hscli docs article get <id> [flags]
```

Examples:

```bash
hscli docs article get <id>
hscli docs article get <id> --output json
```

### `hscli docs article list`

List articles in a Docs collection or category

```
hscli docs article list [flags]
```

- `--collection <value>` — Collection id
- `--category <value>` — Category id
- `--status <all|published|notpublished>` — Filter by status
- `--limit <value>` — Max results to return

Examples:

```bash
hscli docs article list --collection <id>
hscli docs article list --category <id> --status published
```

### `hscli docs article save-draft`

Save a draft for a Docs article (does not publish)

```
hscli docs article save-draft <id> [flags]
```

- `--text <value>` _(required)_ — Draft body — text/HTML, or @file

Examples:

```bash
hscli docs article save-draft <id> --text "<p>Work in progress</p>"
hscli docs article save-draft <id> --text @draft.html
```

### `hscli docs article search`

Search Docs articles by keyword

```
hscli docs article search <query> [flags]
```

- `--collection <value>` — Filter by collection id
- `--site <value>` — Filter by site id
- `--status <all|published|notpublished>` — Filter by status
- `--visibility <all|public|private>` — Filter by visibility
- `--limit <value>` — Max results to return

Examples:

```bash
hscli docs article search "password reset"
hscli docs article search refund --collection <id>
```

### `hscli docs article update`

Update a Docs article

```
hscli docs article update <id> [flags]
```

- `--name <value>` — New article name
- `--text <value>` — New body — text/HTML, or @file
- `--status <published|notpublished>` — Article status
- `--slug <value>` — SEO slug

Examples:

```bash
hscli docs article update <id> --name "New title"
hscli docs article update <id> --text @article.html --status published
```

### `hscli docs auth`

Store your Help Scout Docs API key in the OS keychain (separate from Mailbox auth)

```
hscli docs auth [flags]
```

- `--api-key <value>` — Docs API key (skips the interactive prompt)

Examples:

```bash
hscli docs auth
hscli docs auth --api-key <key>
```

### `hscli docs category create`

Create a Docs category within a collection

```
hscli docs category create [flags]
```

- `--collection <value>` _(required)_ — Collection id
- `--name <value>` _(required)_ — Category name (unique within the collection)
- `--visibility <public|private>` — Visibility
- `--order <value>` — Display order

Examples:

```bash
hscli docs category create --collection <id> --name "Billing"
```

### `hscli docs category delete`

Delete a Docs category

```
hscli docs category delete <id> [flags]
```

- `-y, --yes` — Skip confirmation prompt

Examples:

```bash
hscli docs category delete <id>
hscli docs category delete <id> --yes
```

### `hscli docs category list`

List categories within a Docs collection

```
hscli docs category list <collectionId> [flags]
```

- `--limit <value>` — Max results to return

Examples:

```bash
hscli docs category list <collectionId>
```

### `hscli docs category update`

Update a Docs category

```
hscli docs category update <id> [flags]
```

- `--name <value>` _(required)_ — Category name (required by the Docs API on update)
- `--visibility <public|private>` — Visibility
- `--order <value>` — Display order

Examples:

```bash
hscli docs category update <id> --name "Renamed"
hscli docs category update <id> --name "Billing" --order 2
```

### `hscli docs collection create`

Create a Docs collection

```
hscli docs collection create [flags]
```

- `--site <value>` _(required)_ — Site id
- `--name <value>` _(required)_ — Collection name (unique per account)
- `--visibility <public|private>` — Visibility
- `--order <value>` — Display order

Examples:

```bash
hscli docs collection create --site <siteId> --name "Guides"
```

### `hscli docs collection delete`

Delete a Docs collection

```
hscli docs collection delete <id> [flags]
```

- `-y, --yes` — Skip confirmation prompt

Examples:

```bash
hscli docs collection delete <id>
hscli docs collection delete <id> --yes
```

### `hscli docs collection get`

Get a Docs collection by id or number

```
hscli docs collection get <id> [flags]
```

Examples:

```bash
hscli docs collection get <id>
```

### `hscli docs collection list`

List Docs collections

```
hscli docs collection list [flags]
```

- `--limit <value>` — Max results to return
- `--site <value>` — Filter by Site id
- `--visibility <all|public|private>` — Filter by visibility

Examples:

```bash
hscli docs collection list
hscli docs collection list --site <siteId>
hscli docs collection list --visibility public --output json
```

### `hscli docs collection update`

Update a Docs collection

```
hscli docs collection update <id> [flags]
```

- `--name <value>` _(required)_ — Collection name (required by the Docs API on update)
- `--visibility <public|private>` — Visibility
- `--order <value>` — Display order
- `--site <value>` — Move the collection to this site id

Examples:

```bash
hscli docs collection update <id> --name "Renamed"
hscli docs collection update <id> --name "Guides" --visibility private
```

### `hscli docs site get`

Get a Docs site by id

```
hscli docs site get <id> [flags]
```

Examples:

```bash
hscli docs site get <id>
```

### `hscli docs site list`

List Docs sites

```
hscli docs site list [flags]
```

- `--limit <value>` — Max results to return

Examples:

```bash
hscli docs site list
```

## hscli mailbox

### `hscli mailbox fields`

List custom fields for a mailbox

```
hscli mailbox fields <id> [flags]
```

Examples:

```bash
hscli mailbox fields 123
hscli mailbox fields 123 --output json
```

### `hscli mailbox folders`

List folders for a mailbox

```
hscli mailbox folders <id> [flags]
```

Examples:

```bash
hscli mailbox folders 123
hscli mailbox folders 123 --output json
```

### `hscli mailbox get`

Get a mailbox by ID

```
hscli mailbox get <id> [flags]
```

Examples:

```bash
hscli mailbox get 123
```

### `hscli mailbox list`

List mailboxes

```
hscli mailbox list [flags]
```

- `--limit <value>` — Max results to return

Examples:

```bash
hscli mailbox list
hscli mailbox list --limit 50
```

## hscli profile

### `hscli profile current`

Show the active profile

```
hscli profile current [flags]
```

Examples:

```bash
hscli profile current
```

### `hscli profile list`

List all configured profiles

```
hscli profile list [flags]
```

Examples:

```bash
hscli profile list
```

### `hscli profile use`

Switch the active profile

```
hscli profile use <name> [flags]
```

Examples:

```bash
hscli profile use work
```

## hscli report

### `hscli report beacon`

Aggregate conversation counts by source.type and source.via (derived from Mailbox API; useful for Beacon-origin analysis)

```
hscli report beacon [flags]
```

- `--since <value>` — Window start (ISO date or relative: 7d, 30d, 1h). Default: 30d
- `--mailbox <value>` — Filter by mailbox ID

Examples:

```bash
hscli report beacon
hscli report beacon --since 30d
hscli report beacon --since 30d --mailbox 42
```

### `hscli report company`

Get company report

```
hscli report company [flags]
```

- `--start <value>` _(required)_ — Start date (ISO 8601)
- `--end <value>` _(required)_ — End date (ISO 8601)
- `--mailbox <value>` — Filter by mailbox ID
- `--tag <value>` — Comma-separated tags

Examples:

```bash
hscli report company --start 2024-01-01T00:00:00Z --end 2024-01-31T23:59:59Z
hscli report company --start 2024-01-01T00:00:00Z --end 2024-01-31T23:59:59Z --mailbox 1
```

### `hscli report conversations`

Get conversations report

```
hscli report conversations [flags]
```

- `--start <value>` _(required)_ — Start date (ISO 8601)
- `--end <value>` _(required)_ — End date (ISO 8601)
- `--mailbox <value>` — Filter by mailbox ID
- `--tag <value>` — Comma-separated tags

Examples:

```bash
hscli report conversations --start 2024-01-01T00:00:00Z --end 2024-01-31T23:59:59Z
hscli report conversations --start 2024-01-01T00:00:00Z --end 2024-01-31T23:59:59Z --mailbox 1
```

### `hscli report user`

Get user report

```
hscli report user [flags]
```

- `--start <value>` _(required)_ — Start date (ISO 8601)
- `--end <value>` _(required)_ — End date (ISO 8601)
- `--user <value>` _(required)_ — User ID

Examples:

```bash
hscli report user --start 2024-01-01T00:00:00Z --end 2024-01-31T23:59:59Z --user 10
```

## hscli tag

### `hscli tag get`

Get a tag by ID

```
hscli tag get <id> [flags]
```

Examples:

```bash
hscli tag get 123
```

### `hscli tag list`

List tags

```
hscli tag list [flags]
```

- `--limit <value>` — Max results to return

Examples:

```bash
hscli tag list
hscli tag list --limit 50
```

### `hscli tag usage`

Show conversation count for a tag

```
hscli tag usage <name> [flags]
```

Examples:

```bash
hscli tag usage billing
hscli tag usage "feature request" --output json
```

## hscli user

### `hscli user get`

Get a user by ID

```
hscli user get <id> [flags]
```

Examples:

```bash
hscli user get 123
```

### `hscli user list`

List users

```
hscli user list [flags]
```

- `--mailbox <value>` — Filter by mailbox ID
- `--email <value>` — Filter by email address
- `--limit <value>` — Max results to return

Examples:

```bash
hscli user list
hscli user list --mailbox 42
hscli user list --email jane@example.com
```

### `hscli user me`

Get the authenticated user

```
hscli user me [flags]
```

Examples:

```bash
hscli user me
```

## hscli webhook

### `hscli webhook create`

Create a webhook

```
hscli webhook create [flags]
```

- `--url <value>` _(required)_ — Webhook URL
- `--event <value>` _(required)_ — Comma-separated event names
- `--secret <value>` _(required)_ — Webhook secret
- `--label <value>` — Webhook label

Examples:

```bash
hscli webhook create --url https://example.com/hook --event convo.created --secret s3cret
hscli webhook create --url https://example.com/hook --event convo.created,convo.updated --secret s3cret --label "My Hook"
```

### `hscli webhook delete`

Delete a webhook

```
hscli webhook delete <id> [flags]
```

- `-y, --yes` — Skip confirmation prompt

Examples:

```bash
hscli webhook delete 1
hscli webhook delete 1 --yes
```

### `hscli webhook get`

Get a webhook by ID

```
hscli webhook get <id> [flags]
```

Examples:

```bash
hscli webhook get 1
```

### `hscli webhook list`

List webhooks

```
hscli webhook list [flags]
```

- `--limit <value>` — Max results to return

Examples:

```bash
hscli webhook list
hscli webhook list --output json
```

## hscli workflow

### `hscli workflow list`

List workflows

```
hscli workflow list [flags]
```

- `--mailbox <value>` — Filter by mailbox ID
- `--type <manual|automatic>` — Filter by workflow type
- `--limit <value>` — Max results to return

Examples:

```bash
hscli workflow list
hscli workflow list --mailbox 1 --type manual
```

### `hscli workflow run`

Run a manual workflow on conversations

```
hscli workflow run <id> [flags]
```

- `--conv <value>` _(required)_ — Comma-separated conversation IDs

Examples:

```bash
hscli workflow run 1 --conv 100,200,300
```

