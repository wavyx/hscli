# Packaging

hscli ships through several channels. npm is the source of truth; the others
are generated from the published tarball.

| Channel  | Install                                                                              | Source                         |
| -------- | ------------------------------------------------------------------------------------ | ------------------------------ |
| npm      | `npm install -g @wavyx/hscli`                                                        | this repo (`npm publish`)      |
| Docker   | `docker run --rm ghcr.io/wavyx/hscli --help`                                         | `Dockerfile` (release.yml)     |
| Homebrew | `brew tap wavyx/tap && brew install hscli`                                           | `wavyx/homebrew-tap` (formula) |
| Scoop    | `scoop bucket add hscli https://github.com/wavyx/scoop-hscli && scoop install hscli` | `wavyx/scoop-hscli` (manifest) |

## Updating Homebrew + Scoop on release

After a version is published to npm:

```bash
node scripts/gen-dist.mjs <version>     # e.g. 0.11.0
```

This downloads the npm tarball, computes its sha256, and writes:

- `packaging/homebrew/hscli.rb` → commit to `wavyx/homebrew-tap` as `Formula/hscli.rb`
- `packaging/scoop/hscli.json` → commit to `wavyx/scoop-hscli` as `bucket/hscli.json`

Both generated files are git-ignored here — they live in their own repos.

> Auto-bumping these on every release would need a cross-repo token (PAT); for
> now it's a one-line manual step. The Docker image and npm publish are fully
> automated in `.github/workflows/release.yml`.
