// Syncs canonical docs/*.md into the Starlight content dir (website/src/content/docs).
// Adds Starlight frontmatter (title from the first H1) and rewrites inter-doc
// links to site routes. Generated files are gitignored; docs/*.md stay the source.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'docs')
const outDir = join(root, 'website', 'src', 'content', 'docs')
mkdirSync(outDir, { recursive: true })

const docFiles = readdirSync(srcDir).filter((f) => f.endsWith('.md'))
const slugs = new Set(docFiles.map((f) => f.replace(/\.md$/, '')))

const titleCase = (s) =>
  s.replace(/(^|[-_])(\w)/g, (_, sep, c) => (sep ? ' ' : '') + c.toUpperCase())

// ](name.md) / ](name.md#anchor) -> ](/hscli/name/#anchor) for known docs
const rewriteLinks = (md) =>
  md.replace(/\]\(([\w-]+)\.md(#[\w-]+)?\)/g, (m, name, anchor) =>
    slugs.has(name) ? `](/hscli/${name}/${anchor || ''})` : m,
  )

for (const file of docFiles) {
  const raw = readFileSync(join(srcDir, file), 'utf8')
  let body
  if (raw.startsWith('---\n')) {
    body = raw // already has frontmatter (e.g. generated commands.md)
  } else {
    const h1 = raw.match(/^#\s+(.+)$/m)
    const title = (h1 ? h1[1] : titleCase(file.replace(/\.md$/, '')))
      .replace(/^hscli\s*[—–-]\s*/i, '')
      .trim()
    const stripped = h1 ? raw.replace(h1[0], '').replace(/^\n+/, '') : raw
    body = `---\ntitle: ${title}\n---\n\n${stripped}`
  }
  writeFileSync(join(outDir, file), rewriteLinks(body))
}

console.log(`Synced ${docFiles.length} docs -> website/src/content/docs`)
