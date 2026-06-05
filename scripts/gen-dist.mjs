// Regenerate the Homebrew formula + Scoop manifest for a published version.
//
//   node scripts/gen-dist.mjs <version>
//
// Writes packaging/homebrew/hscli.rb and packaging/scoop/hscli.json (both
// git-ignored — they live in the wavyx/homebrew-tap and wavyx/scoop-hscli
// repos). See packaging/README.md. Run AFTER the version is on npm.
import { writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const PKG = '@wavyx/hscli'

/** Render the Homebrew formula (standard node-CLI pattern). */
export function renderHomebrewFormula({ url, sha256 }) {
  return `class Hscli < Formula
  desc "Command-line interface for Help Scout"
  homepage "https://github.com/wavyx/hscli"
  url "${url}"
  sha256 "${sha256}"
  license "MIT"

  depends_on "jq"
  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    # hscli's --jq flag uses node-jq, which normally downloads its own jq binary
    # via a postinstall script. std_npm_args passes --ignore-scripts and the
    # Homebrew build sandbox blocks network, so point node-jq at the Homebrew jq
    # instead (node-jq honors $JQ_PATH at runtime).
    (bin/"hscli").write_env_script libexec/"bin/hscli",
                                   JQ_PATH: Formula["jq"].opt_bin/"jq"
  end

  test do
    assert_match "hscli", shell_output("#{bin}/hscli version")
    # Exercise --jq so the node-jq / Homebrew-jq wiring can't silently regress.
    system bin/"hscli", "config", "list", "--output", "json", "--jq", "."
  end
end
`
}

/** Render the Scoop manifest (installs via npm; needs Node). */
export function renderScoopManifest({ version }) {
  return (
    JSON.stringify(
      {
        version,
        description: 'Command-line interface for Help Scout',
        homepage: 'https://github.com/wavyx/hscli',
        license: 'MIT',
        depends: 'nodejs',
        installer: { script: [`npm install -g ${PKG}@${version}`] },
        uninstaller: { script: [`npm uninstall -g ${PKG}`] },
        checkver: {
          url: `https://registry.npmjs.org/${PKG}`,
          jsonpath: "$.['dist-tags'].latest",
        },
        autoupdate: { version: '$version' },
      },
      null,
      2,
    ) + '\n'
  )
}

/** Fetch the npm tarball URL + its sha256 for a version. */
export async function fetchDist(version, fetchFn = fetch) {
  const meta = await fetchFn(
    `https://registry.npmjs.org/${PKG}/${version}`,
  ).then((r) => r.json())
  const url = meta.dist.tarball
  const buf = Buffer.from(await fetchFn(url).then((r) => r.arrayBuffer()))
  const sha256 = createHash('sha256').update(buf).digest('hex')
  return { version, url, sha256 }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const version = process.argv[2]
  if (!version) {
    console.error('usage: node scripts/gen-dist.mjs <version>')
    process.exit(1)
  }
  const dist = await fetchDist(version)
  mkdirSync(new URL('../packaging/homebrew/', import.meta.url), {
    recursive: true,
  })
  mkdirSync(new URL('../packaging/scoop/', import.meta.url), {
    recursive: true,
  })
  writeFileSync(
    new URL('../packaging/homebrew/hscli.rb', import.meta.url),
    renderHomebrewFormula(dist),
  )
  writeFileSync(
    new URL('../packaging/scoop/hscli.json', import.meta.url),
    renderScoopManifest(dist),
  )
  console.log(
    `Wrote packaging/homebrew/hscli.rb + packaging/scoop/hscli.json for ${version} (sha256 ${dist.sha256})`,
  )
}
