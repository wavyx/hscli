// Generates docs/commands.md from the built oclif manifest.
// Run via `npm run docs:commands` (after `npm run build`). Do not hand-edit the output.
import { readFileSync, writeFileSync } from 'node:fs'

const BIN = 'hscli'
const manifest = JSON.parse(
  readFileSync(new URL('../oclif.manifest.json', import.meta.url)),
)

const commands = Object.values(manifest.commands)
  .filter((c) => !c.hidden)
  .sort((a, b) => a.id.localeCompare(b.id))

const byTopic = {}
for (const c of commands) {
  const topic = c.id.includes(':') ? c.id.split(':')[0] : '_root'
  ;(byTopic[topic] ??= []).push(c)
}

const flagLine = (name, f) => {
  const alias = f.char ? `-${f.char}, ` : ''
  const value =
    f.type === 'option' ? ` <${(f.options || []).join('|') || 'value'}>` : ''
  const required = f.required ? ' _(required)_' : ''
  return `- \`${alias}--${name}${value}\`${required} — ${f.description || ''}`.trimEnd()
}

const exampleText = (e) =>
  (typeof e === 'string' ? e : e.command || '').replaceAll(
    '<%= config.bin %>',
    BIN,
  )

let out = `---
title: Commands
description: Full command reference for the hscli command-line interface.
---

<!-- AUTO-GENERATED from the oclif manifest by scripts/gen-commands.mjs — do not edit by hand. -->

Reference for \`${BIN}\` v${manifest.version} (${commands.length} commands). Every command also accepts the global flags \`--output table|json|yaml|csv\`, \`--jq\`, \`--fields\`, \`--profile\`, \`--no-color\`, \`--verbose\`, \`--no-retry\`, and \`--timeout\`.

`

for (const topic of Object.keys(byTopic).sort()) {
  out += `## ${topic === '_root' ? 'Top-level' : `${BIN} ${topic}`}\n\n`
  for (const c of byTopic[topic]) {
    const cmd = c.id.replaceAll(':', ' ')
    const args = Object.entries(c.args || {})
      .map(([name, a]) => (a.required ? `<${name}>` : `[${name}]`))
      .join(' ')
    out += `### \`${BIN} ${cmd}\`\n\n`
    if (c.description) out += `${c.description}\n\n`
    out +=
      '```\n' + `${BIN} ${cmd}${args ? ` ${args}` : ''} [flags]` + '\n```\n\n'
    const flags = Object.entries(c.flags || {}).filter(
      ([, f]) => f.helpGroup !== 'GLOBAL',
    )
    if (flags.length)
      out += flags.map(([n, f]) => flagLine(n, f)).join('\n') + '\n\n'
    const examples = (c.examples || []).map(exampleText).filter(Boolean)
    if (examples.length)
      out += 'Examples:\n\n```bash\n' + examples.join('\n') + '\n```\n\n'
  }
}

writeFileSync(new URL('../docs/commands.md', import.meta.url), out)
console.log(`Wrote docs/commands.md — ${commands.length} commands`)
