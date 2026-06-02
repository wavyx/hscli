# Backup & Data Portability

`hscli backup` produces a GDPR-style snapshot of a Help Scout account on
disk. Subsequent runs sync only what changed. The output is a plain
directory of JSON files you can browse, version, archive, or pipe into
any other tool.

## Quick Start

```bash
# first run — full snapshot
hscli backup --out ~/hs-backup

# subsequent runs — incremental (auto-detected via manifest.json)
hscli backup --out ~/hs-backup

# weekly: also detect deletions (writes tombstones to _deleted.ndjson)
hscli backup --out ~/hs-backup --reconcile

# include attachments + history log
hscli backup --out ~/hs-backup --attachments --keep-history

# one-shot archive
hscli backup --out ~/hs-backup --full --attachments --compress
```

## Output Structure

```
hs-backup/
├── manifest.json                # version, account, history, per-resource lastSyncedAt
├── checkpoint.json              # only present mid-run; deleted on success
├── account/
│   ├── users/
│   │   ├── _index.ndjson
│   │   └── {id}.json
│   └── teams/
│       ├── _index.ndjson
│       └── {id}.json
├── mailboxes/
│   ├── _index.ndjson
│   └── {id}/
│       └── mailbox.json
├── conversations/
│   ├── _index.ndjson
│   ├── {id}/
│   │   ├── conversation.json    # embedded threads, customers, tags
│   │   └── attachments/
│   │       ├── _manifest.json   # {id, filename, mimeType, size, downloadedAt}
│   │       └── {attId}_{name}
├── customers/
│   ├── _index.ndjson
│   └── {id}.json
├── tags.json                    # small finite resources stay as single arrays
├── workflows.json
├── webhooks.json
├── _deleted.ndjson              # only when --reconcile finds deletions
└── _history/                    # only when --keep-history is set
    ├── 2026-05-28T10-00-00-000-full.ndjson
    └── 2026-06-04T10-00-00-000-incremental.ndjson
```

## Resources Captured

| Resource        | Endpoint                                   | Layout                                                |
| --------------- | ------------------------------------------ | ----------------------------------------------------- |
| `users`         | `/v2/users`                                | per-item under `account/users/`                       |
| `teams`         | `/v2/teams`                                | per-item under `account/teams/`                       |
| `mailboxes`     | `/v2/mailboxes`                            | `mailboxes/{id}/mailbox.json`                         |
| `tags`          | `/v2/tags`                                 | single file `tags.json`                               |
| `workflows`     | `/v2/workflows`                            | single file `workflows.json`                          |
| `webhooks`      | `/v2/webhooks`                             | single file `webhooks.json`                           |
| `customers`     | `/v2/customers`                            | per-item under `customers/`                           |
| `conversations` | `/v2/conversations` (with `embed=threads`) | per-item under `conversations/{id}/conversation.json` |

Conversations include their threads inline (and tags + primary customer
ref live on the conversation object itself). Pass `--attachments` to
additionally download binary attachments referenced by threads.

## Modes

| Mode            | When                                                         |
| --------------- | ------------------------------------------------------------ |
| **Full**        | First run, or with `--full`                                  |
| **Incremental** | Subsequent runs (auto-detected via `manifest.json`)          |
| **Resume**      | After interruption, with `--resume` (uses `checkpoint.json`) |
| **Reconcile**   | With `--reconcile` — full ID-only scan to detect deletions   |

### Incremental Detection

If `--out` already contains a `manifest.json` produced by hscli, the
next run becomes incremental. Each resource queries
`?modifiedSince=<lastSyncedAt>` to fetch only changed items.

If `--out` exists but lacks `manifest.json`, hscli refuses to write to
avoid clobbering unrelated data.

### Resume

If a run is interrupted, `checkpoint.json` records which resources
finished and where the in-progress one stopped. Re-run with
`--resume` and it picks up where it left off. Successful completion
deletes the checkpoint.

### Reconcile (deletion detection)

`modifiedSince` queries never return deleted items, so incremental
runs miss deletions. Pass `--reconcile` (weekly is reasonable) to do
a full ID-only scan per resource. Items present locally but missing
remotely are tombstoned in `_deleted.ndjson`:

```json
{ "resource": "customers", "id": 11, "deletedAt": "2026-06-04T10:00:00Z" }
```

The local file is **not** deleted — tombstones preserve the archived
data while marking that the remote no longer holds it.

## History Log (`--keep-history`)

Every run with `--keep-history` appends a NDJSON entry per
upsert/delete to `_history/{timestamp}-{mode}.ndjson`:

```json
{"op":"upsert","resource":"conversations","id":3336043008,"snapshot":{...}}
{"op":"delete","resource":"customers","id":999,"tombstoneAt":"..."}
```

Append-only. Not used by hscli itself — pure audit trail.

## Attachments (`--attachments`)

Off by default (binaries can be large). When enabled, hscli walks each
conversation's threads and downloads attachments to
`conversations/{convId}/attachments/{attId}_{filename}`. Existing
files are skipped (attachment IDs are immutable in Help Scout).

Concurrency is capped by `--parallel N` (default 4).

## Compression (`--compress`)

Final-step tar.gz of the output dir. Produces `<out>.tar.gz` alongside
the directory; the source dir is preserved.

Incompatible with future incremental runs on the same target —
incremental needs the uncompressed working dir.

## Dry Run (`--dry-run`)

Walks the API and computes counts without writing files. Useful for
estimating expected size before a big run.

## Flag Reference

| Flag             | Default    | Purpose                                            |
| ---------------- | ---------- | -------------------------------------------------- |
| `--out PATH`     | (required) | Target directory                                   |
| `--full`         | false      | Force full re-sync, ignore manifest                |
| `--resume`       | false      | Continue interrupted run from checkpoint           |
| `--reconcile`    | false      | Detect deletions via ID-only scan                  |
| `--keep-history` | false      | Append delta log to `_history/`                    |
| `--since DATE`   | —          | Override `lastSyncedAt` (ISO or `7d`, `30d`, `1h`) |
| `--include LIST` | all        | CSV of resources to include                        |
| `--exclude LIST` | none       | CSV of resources to exclude                        |
| `--attachments`  | false      | Download attachment binaries                       |
| `--compress`     | false      | Produce `.tar.gz` of output dir                    |
| `--parallel N`   | 4          | Concurrent attachment downloads                    |
| `--dry-run`      | false      | Show plan, no writes                               |

## Scheduling

hscli stays stateless — scheduling happens at the OS level.

### cron (Linux/macOS)

```cron
# Daily incremental at 02:00
0 2 * * * /usr/local/bin/hscli backup --out ~/hs-backup --profile prod >> ~/.hscli/backup.log 2>&1

# Weekly full reconcile on Sunday 03:00
0 3 * * 0 /usr/local/bin/hscli backup --out ~/hs-backup --profile prod --reconcile --keep-history >> ~/.hscli/backup.log 2>&1
```

### launchd (macOS)

`~/Library/LaunchAgents/com.user.hscli-backup.plist`:

```xml
<plist version="1.0">
<dict>
  <key>Label</key><string>com.user.hscli-backup</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/hs</string>
    <string>backup</string>
    <string>--out</string><string>/Users/me/hs-backup</string>
    <string>--profile</string><string>prod</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>2</integer><key>Minute</key><integer>0</integer></dict>
</dict>
</plist>
```

Load it: `launchctl load ~/Library/LaunchAgents/com.user.hscli-backup.plist`

### Task Scheduler (Windows)

```powershell
$action = New-ScheduledTaskAction -Execute 'hs.exe' -Argument 'backup --out C:\hs-backup --profile prod'
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName 'hscli-backup' -Action $action -Trigger $trigger
```

## Single Conversation Archive

For one-off archival of a specific conversation:

```bash
hscli conv dump 3336043008 > conv-3336043008.json
hscli conv dump 3336043008 --out conv-3336043008.json
```

The dump bundles the conversation, all threads, all customers, all
tags, and attachment metadata in one JSON file. No binaries are
downloaded — use `hscli backup --attachments` for that.

## Bulk Export with Embeds

`hscli conv export` lists conversations as bulk JSON/CSV/NDJSON. Pass
`--embed threads` to include thread bodies inline (HAL-native, single
request per page):

```bash
hscli conv export --embed threads --format ndjson > full.ndjson
hscli conv export --embed threads --status closed --format json
```

`--embed` is incompatible with `--format csv` (the embedded structure
doesn't flatten cleanly). Only `threads` is supported — Help Scout's
API does not currently allow embedding customers or tags on the
conversations endpoint.

## Restoring

Restore is **not** implemented in v0.5. Help Scout's API doesn't
expose a way to recreate entities with their original IDs, so a true
restore requires creating new entities and re-mapping references —
out of scope for this version. The backup is suitable for archival,
audit, migration analysis, and external indexing.

## Comparison with Other Tools

| Tool               | Format                          | Incremental       | Deletions            | Attachments            |
| ------------------ | ------------------------------- | ----------------- | -------------------- | ---------------------- |
| Slack export       | zip of JSON                     | ❌ full each time | ❌                   | ✅                     |
| GitHub data export | tar.gz                          | ❌ full each time | ❌                   | ✅                     |
| Google Takeout     | zip                             | ❌                | ❌                   | ✅                     |
| **hscli backup**   | dir of JSON (+ optional tar.gz) | ✅ via manifest   | ✅ via `--reconcile` | ✅ via `--attachments` |
