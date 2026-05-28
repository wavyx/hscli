# Beacon

Help Scout Beacon is an embeddable customer-support widget (web + mobile SDKs).
hscli's Beacon support is intentionally **bounded by Help Scout's API surface** —
Beacon configuration and analytics live in the Help Scout web UI only, with no
REST endpoint to manage them. hscli covers the slice that is feasible:
conversation-source analysis (via Mailbox API) plus local helpers for Secure
Mode signing and embed-snippet generation.

## What works

| Command                                                                         | Purpose                                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `hs conv list --source <type>`                                                  | Filter conversations by `source.type`                                     |
| `hs conv export --source <type>`                                                | Same filter on bulk export                                                |
| `hs report beacon [--since N] [--mailbox]`                                      | Aggregate convs by `source.type`/`source.via` with percentages            |
| `hs beacon sign --email --secret`                                               | HMAC-SHA256 of email for Secure Mode                                      |
| `hs beacon verify --email --secret --signature`                                 | Verify a candidate signature (exit 0 on match, 1 on mismatch)             |
| `hs beacon embed <id> [--color] [--position] [--style] [--text] [--icon-image]` | Generate `<script>` embed block                                           |
| `hs beacon identify-snippet --beacon-id --secret --stack`                       | Generate server-side identify code (node / rails / php / django / python) |

`source.type` values: `api`, `beacon`, `channel`, `chat`, `consumer`, `coreapi`,
`customer`, `email`.

## What does NOT work (Help Scout API limitation)

| Want                                         | Reality                                                               |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `GET /v2/beacons` / `PATCH /v2/beacons/{id}` | No endpoint exists. Beacon CRUD is web-UI only                        |
| Beacon usage dashboards                      | Web UI only (use `hs report beacon` for source-derived approximation) |
| Enable / disable a Beacon remotely           | Web UI only                                                           |
| Update color, prompts, custom fields via API | Web UI only                                                           |
| Push Docs article suggestions server-side    | Beacon's `suggest()` is client-side only                              |
| Trigger Beacon events (open/close/chat)      | Pure client-side JS                                                   |
| Mobile SDK config (iOS / Android)            | Out of scope (large SDK config, low CLI ROI)                          |

Useful workarounds:

- **Webhook events** — Beacon emits HS webhooks (`chat-started`, `email-sent`,
  `message-clicked`). Subscribe via existing `hs webhook create/list` commands.
- **Source-derived analytics** — `hs report beacon` aggregates conversations by
  their origin (beacon / chat / email / api), giving you a workable proxy for
  per-channel volume.
- **Article IDs** — Beacon's `suggest()` and `article()` JS methods need Docs
  article IDs. Use the Docs API (planned v0.8) to fetch them programmatically.

## Quick start

### Generate a Secure Mode signature for a logged-in user

```bash
export HSCLI_BEACON_SECRET="your-secret-from-beacon-settings"
hs beacon sign --email user@example.com
# → 8a3f...e92
```

Use the output as the `signature` argument to `Beacon('identify', { … })` in
your page.

### Verify a signature (debugging)

```bash
hs beacon verify --email user@example.com --secret KEY --signature 8a3f...e92
# → valid           (exit 0)
# OR
# → invalid         (exit 1)
```

### Generate an embed snippet for your website

```bash
hs beacon embed YOUR_BEACON_ID --color "#5b21b6" --position right --style iconAndText --text "Help"
```

Paste the output into your HTML's `<head>` (or just before `</body>`).

### Generate server-side identify code for your stack

```bash
hs beacon identify-snippet --beacon-id YOUR_BEACON_ID --secret KEY --stack rails
hs beacon identify-snippet --beacon-id YOUR_BEACON_ID --secret KEY --stack php
hs beacon identify-snippet --beacon-id YOUR_BEACON_ID --secret KEY --stack node
hs beacon identify-snippet --beacon-id YOUR_BEACON_ID --secret KEY --stack django
hs beacon identify-snippet --beacon-id YOUR_BEACON_ID --secret KEY --stack python
```

Defaults to `node`. Templates use environment variables for the secret — never
inline the real secret in source files. Treat the output as a starting point
to paste into your codebase.

### Report on Beacon-origin conversations

```bash
hs report beacon                          # last 30 days
hs report beacon --since 7d
hs report beacon --since 7d --mailbox 42
hs report beacon --output json | jq .
```

Output groups by `source.type` and `source.via`, ranked by count.

### Filter conversations by origin

```bash
hs conv list --source beacon --limit 20
hs conv list --source chat --status active
hs conv export --source beacon --format ndjson > beacon-convs.ndjson
```

## Caveats

- **`--source` is a client-side filter.** Help Scout's API does not expose
  `source` as a query parameter. hscli fetches the same pages and filters
  locally. On large accounts this is slow — narrow the window with `--since`
  or `--mailbox`. The implementation streams pages and stops once `--limit`
  matching items are collected.

- **Secret handling.** Pass the Beacon secret via `--secret`, the
  `HSCLI_BEACON_SECRET` env var, or your shell's secret manager. Never commit
  the secret to source control. The generated identify-snippet templates read
  from `BEACON_SECRET` env var by design.

- **HMAC algorithm.** Help Scout Beacon Secure Mode uses HMAC-SHA256 with hex
  encoding. The signature input is the customer's **email** (not a JSON
  payload). `hs beacon sign` and `hs beacon verify` match this exact contract.

## See also

- [Help Scout: Beacon Secure Mode](https://developer.helpscout.com/beacon-2/web/secure-mode/)
- [Help Scout: Beacon JavaScript API](https://developer.helpscout.com/beacon-2/web/javascript-api/)
- [`hs webhook` commands](commands.md#webhooks) for Beacon-emitted events
