# Contributing to hscli

## Development Setup

```bash
git clone https://github.com/wavyx/hscli.git
cd hscli
npm install
```

Run the CLI in development mode:

```bash
./bin/dev.js --help
./bin/dev.js version
```

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

Tests use [vitest](https://vitest.dev/) with [nock](https://github.com/nock/nock) for HTTP mocking.

## Linting

```bash
# Check
npm run lint

# Fix
npm run lint:fix
```

Uses ESLint 9 (flat config) and Prettier.

## Project Structure

```
src/
  base-command.js       # Shared command base (auth, output, profile)
  commands/             # oclif commands (directory = topic)
    auth/               # hs auth login/logout/status/refresh
    conv/               # hs conv list/get
    mailbox/            # hs mailbox list/get
    ...
  lib/                  # Core modules
    auth.js             # OAuth flows
    client.js           # Help Scout API client
    config.js           # Config management
    keychain.js         # Credential storage
    output/             # Formatters (table, json)
  hooks/                # oclif lifecycle hooks
test/
  commands/             # Command integration tests
  lib/                  # Unit tests
  fixtures/             # API response fixtures
```

## Adding a Command

1. Create `src/commands/<topic>/<name>.js`
2. Extend `BaseCommand`
3. Define `static description`, `flags`, `args`
4. Implement `async run()`
5. Add tests in `test/commands/<topic>/<name>.test.js`
6. Run `npx oclif manifest` to update the command index

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add webhook list command
fix: handle expired token refresh
docs: update auth flow documentation
test: add mailbox get edge cases
chore: update dependencies
```

## Pull Requests

- One feature/fix per PR
- Tests required for new commands
- Run `npm test && npm run lint` before submitting
- CI must pass (Node 20/22 x ubuntu/macos/windows)
