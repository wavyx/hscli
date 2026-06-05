// Generates the command reference from the built oclif manifest:
//   - docs/commands.md                              (GitHub-facing)
//   - website/src/content/docs/reference/commands.mdx (Starlight docs site)
// Run via `npm run docs:commands` (after `npm run build`). Do not hand-edit output.
import { readFileSync, writeFileSync } from 'node:fs'

const BIN = 'hscli'

export function groupByTopic(manifest) {
  const commands = Object.values(manifest.commands)
    .filter((c) => !c.hidden)
    .sort((a, b) => a.id.localeCompare(b.id))
  const byTopic = {}
  for (const c of commands) {
    const topic = c.id.includes(':') ? c.id.split(':')[0] : '_root'
    ;(byTopic[topic] ??= []).push(c)
  }
  return { commands, byTopic }
}

const nonGlobalFlags = (c) =>
  Object.entries(c.flags || {}).filter(([, f]) => f.helpGroup !== 'GLOBAL')

const argString = (c) =>
  Object.entries(c.args || {})
    .map(([name, a]) => (a.required ? ` <${name}>` : ` [${name}]`))
    .join('')

const firstLine = (s) =>
  String(s || '')
    .split('\n')[0]
    .trim()
// Escape MDX-significant chars for table cells: `|` breaks the table, and
// bare `<`/`>` (e.g. "<script>" in a summary) are parsed as JSX tags.
const tableCell = (s) =>
  firstLine(s)
    .replaceAll('|', '\\|')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

const exampleText = (e) =>
  (typeof e === 'string' ? e : e.command || '').replaceAll(
    '<%= config.bin %>',
    BIN,
  )

/* ============================================================
   GitHub-facing markdown (docs/commands.md)
   ============================================================ */
const flagLine = (name, f) => {
  const alias = f.char ? `-${f.char}, ` : ''
  const value =
    f.type === 'option' ? ` <${(f.options || []).join('|') || 'value'}>` : ''
  const required = f.required ? ' _(required)_' : ''
  return `- \`${alias}--${name}${value}\`${required} — ${f.description || ''}`.trimEnd()
}

export function renderGithubMarkdown(manifest, bin = BIN) {
  const { commands, byTopic } = groupByTopic(manifest)
  let out = `---
title: Commands
description: Full command reference for the hscli command-line interface.
---

<!-- AUTO-GENERATED from the oclif manifest by scripts/gen-commands.mjs — do not edit by hand. -->

Reference for \`${bin}\` v${manifest.version} (${commands.length} commands). Every command also accepts the global flags \`--output table|json|yaml|csv\`, \`--jq\`, \`--fields\`, \`--profile\`, \`--no-color\`, \`--verbose\`, \`--no-retry\`, and \`--timeout\`.

`
  for (const topic of Object.keys(byTopic).sort()) {
    out += `## ${topic === '_root' ? 'Top-level' : `${bin} ${topic}`}\n\n`
    for (const c of byTopic[topic]) {
      const cmd = c.id.replaceAll(':', ' ')
      out += `### \`${bin} ${cmd}\`\n\n`
      if (c.description) out += `${c.description}\n\n`
      out += '```\n' + `${bin} ${cmd}${argString(c)} [flags]` + '\n```\n\n'
      const flags = nonGlobalFlags(c)
      if (flags.length)
        out += flags.map(([n, f]) => flagLine(n, f)).join('\n') + '\n\n'
      const examples = (c.examples || []).map(exampleText).filter(Boolean)
      if (examples.length)
        out += 'Examples:\n\n```bash\n' + examples.join('\n') + '\n```\n\n'
    }
  }
  return out
}

/* ============================================================
   Starlight docs site MDX (reference/commands.mdx)
   ============================================================ */
// topic → [badge label, badge classes]. Heading text stays the bare topic
// so the slug is `#conv`, `#customer`, … (guides link to those anchors).
const TOPIC_BADGE = {
  conv: ['conversations', 'badge--accent badge--dot'],
  customer: ['people', 'badge--dot'],
  report: ['metrics', 'badge--dot'],
  auth: ['credentials', 'badge--dot'],
  config: ['settings', 'badge--dot'],
  profile: ['profiles', 'badge--dot'],
  alias: ['shortcuts', 'badge--dot'],
  mailbox: ['inboxes', 'badge--dot'],
  tag: ['tags', 'badge--dot'],
  user: ['team', 'badge--dot'],
  webhook: ['events', 'badge--dot'],
  workflow: ['automation', 'badge--dot'],
  beacon: ['beacon', 'badge--coral badge--dot'],
  api: ['escape hatch', 'badge--coral badge--dot'],
  backup: ['archive', 'badge--dot'],
  doctor: ['diagnostics', 'badge--dot'],
  docs: ['knowledge base', 'badge--dot'],
  mcp: ['AI agents', 'badge--accent badge--dot'],
}

const TOPIC_BLURB = {
  conv: 'List, read, and act on conversations — the workhorse of hscli. See the [Conversations guide](/guides/conversations/).',
  customer:
    'Search, read, create, and update the people behind your conversations. See the [Customers guide](/guides/customers/).',
  report:
    'Volume, company, and per-user metrics as JSON, CSV, or a table. See the [Reporting guide](/guides/reporting/).',
  auth: 'Authenticate and manage credentials (stored in your OS keychain). See [Authentication](/guides/authentication/).',
  config:
    'Read and write per-profile configuration. See [Configuration](/guides/configuration/).',
  mailbox: 'Inspect mailboxes, folders, and custom fields.',
  tag: 'List tags and their usage.',
  user: 'Look up team members and the authenticated user.',
  webhook: 'Create, list, and delete webhooks.',
  workflow: 'List and manually run workflows.',
  beacon: 'Generate Beacon embeds and sign/verify identity payloads.',
  profile: 'Switch between named auth profiles.',
  alias: 'Define shortcuts for commands you run often.',
  api: 'Reach any Help Scout endpoint directly — locked to the Help Scout host. See the [`hscli api` reference](/reference/api/).',
  backup:
    'Dump your whole account to JSON with incremental refresh, resume, deletion detection, and attachments. See the [Backups guide](/guides/backups/).',
  doctor: 'Diagnose your environment, auth, and connectivity.',
  docs: 'Manage your Help Scout Docs knowledge base — sites, collections, categories, and articles. Uses a separate Docs API key (`hscli docs auth`). See the [Docs guide](/guides/docs/).',
  mcp: 'Run hscli as a Model Context Protocol server so AI agents can call it as native tools. Reads by default; pass `--allow-writes` to expose mutating tools. See the [MCP guide](/automation/mcp/).',
}

const renderTopicTable = (list) => {
  let t = `| Command | Description | Key flags |\n| --- | --- | --- |\n`
  for (const c of list) {
    const cmd = `${c.id.replaceAll(':', ' ')}${argString(c)}`
    const flags =
      nonGlobalFlags(c)
        .map(([n]) => `\`--${n}\``)
        .join(' ') || '—'
    t += `| \`${cmd}\` | ${tableCell(c.summary || c.description)} | ${flags} |\n`
  }
  return t + '\n'
}

const GLOBAL_AND_EXIT = () => `## Global flags

These work on every command.

| Flag | Description | Default |
| --- | --- | --- |
| \`--output\` | Output format (\`table\` · \`json\` · \`yaml\` · \`csv\`). | \`table\` |
| \`--jq\` | Apply a jq expression to JSON output. | — |
| \`--fields\` | Project a comma-separated subset of fields. | all |
| \`--profile\` | Use a named auth profile. | \`default\` |
| \`--no-color\` | Disable ANSI colors. | \`false\` |
| \`--verbose\` | Verbose logging to stderr. | \`false\` |
| \`--no-retry\` | Disable automatic retry on rate limits. | \`false\` |
| \`--timeout\` | Per-request timeout in ms. | — |

See [Output & filtering](/automation/output/) for details.

## Exit codes

Deterministic, so scripts and agents can branch on the result.

| Code | Meaning |
| --- | --- |
| \`0\` | <span class="badge badge--lime badge--dot">success</span> |
| \`1\` | Usage / generic error |
| \`65\` | Validation error (HTTP 422) |
| \`69\` | Help Scout API unavailable (5xx) |
| \`70\` | Unexpected internal error |
| \`75\` | Rate limited — retry with backoff |
| \`77\` | Not authenticated / forbidden (401, 403) |
| \`78\` | Configuration error |

Full guide: [Exit codes](/automation/exit-codes/).
`

export function renderWebsiteMdx(manifest, bin = BIN) {
  const { commands, byTopic } = groupByTopic(manifest)
  let out = `---
title: Command reference
description: Every ${bin} command, flag, and exit code — generated from the CLI manifest.
---

{/* AUTO-GENERATED from the oclif manifest by scripts/gen-commands.mjs — do not edit by hand. */}

Every command follows the same grammar:

\`\`\`text
${bin} <group> <action> [target] [flags]
\`\`\`

Run \`${bin} <group> --help\` for the live, self-describing version of any command.
This page lists all ${commands.length} commands in \`${bin}\` v${manifest.version}.

`
  const topics = Object.keys(byTopic)
    .filter((t) => t !== '_root')
    .sort()

  for (const topic of topics) {
    const [label, cls] = TOPIC_BADGE[topic] || [topic, 'badge--dot']
    out += `## ${topic}\n\n<span class="badge ${cls}">${label}</span>\n\n`
    if (TOPIC_BLURB[topic]) out += `${TOPIC_BLURB[topic]}\n\n`
    out += renderTopicTable(byTopic[topic])
  }

  // Root-level commands each get their own section (so #backup, #api … resolve).
  for (const c of byTopic._root || []) {
    const [label, cls] = TOPIC_BADGE[c.id] || ['command', 'badge--dot']
    out += `## ${c.id}\n\n<span class="badge ${cls}">${label}</span>\n\n`
    if (TOPIC_BLURB[c.id]) out += `${TOPIC_BLURB[c.id]}\n\n`
    out += renderTopicTable([c])
    if (c.id === 'api') {
      out +=
        '```bash frame="terminal"\n' +
        `${bin} api GET /v2/mailboxes --jq '.[] | .name'\n` +
        `${bin} api POST /v2/conversations/4831/tags --body '{"tags":["vip"]}'\n` +
        '```\n\n'
    }
  }

  out += GLOBAL_AND_EXIT()
  return out
}

/* ============================================================
   CLI entry — write both files (guarded so imports stay pure)
   ============================================================ */
const invokedDirectly =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`

if (invokedDirectly) {
  const manifest = JSON.parse(
    readFileSync(new URL('../oclif.manifest.json', import.meta.url)),
  )
  writeFileSync(
    new URL('../docs/commands.md', import.meta.url),
    renderGithubMarkdown(manifest),
  )
  writeFileSync(
    new URL(
      '../website/src/content/docs/reference/commands.mdx',
      import.meta.url,
    ),
    renderWebsiteMdx(manifest),
  )
  const count = groupByTopic(manifest).commands.length
  console.log(`Wrote docs/commands.md + website reference — ${count} commands`)
}
