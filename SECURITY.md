# Security Policy

## Reporting a vulnerability

hscli handles Help Scout OAuth credentials, so security reports are taken
seriously.

**Please do not open public GitHub issues for security vulnerabilities.**

Report privately through GitHub's
[private vulnerability reporting](https://github.com/wavyx/hscli/security/advisories/new)
(the repository's **Security** tab → **Report a vulnerability**). Include:

- A description of the issue and its impact
- Steps to reproduce
- The affected version (`hscli version`)

You will receive an acknowledgement within 72 hours and a status update within
7 days. Once a fix is released, reporters who wish to be named will be credited.

## Supported versions

hscli is pre-1.0. Only the latest released version receives security fixes.

## How hscli handles credentials

- OAuth tokens are stored **only** in the operating system keychain (macOS
  Keychain, Windows Credential Manager, or libsecret on Linux). hscli refuses
  to write credentials to disk in plaintext; if no keychain is available,
  authentication fails rather than falling back to insecure storage.
- The `hscli api` escape hatch only sends your token to `api.helpscout.net`.
  Requests that resolve to any other host are refused.
- App secrets passed via `--app-secret` may be recorded in your shell history.
  Prefer the `HSCLI_APP_SECRET` environment variable or the interactive
  `hscli auth setup` wizard.
