# Proposal

## Why

More mainframe teams keep JCL in Git. They need a check that runs in a terminal and in CI, and marks problems on the pull request, not only in the browser.

## What Changes

- A `jclcheck` command (`backend/bin/jclcheck.js`, logic in `backend/src/cli.js`) that checks files or globs with the same validator as the API, using only Node built-ins.
- Options `--zos`, `--jes`, `--library <dir>`, `--profile <file>`, `--format text|json|sarif`, `--max-warnings <n>`.
- Text output `file:line:column  severity  code  message`; JSON; SARIF 2.1.0 with a rule per code (its message and fix) and suppressed results marked `inSource`.
- Exit codes 0 (no errors), 1 (errors or too many warnings), 2 (couldn't run; other files still checked).
- Opt-in usage counting (`JCLCHECK_TELEMETRY=1` or `--telemetry`; `DO_NOT_TRACK=1` wins; `JCLCHECK_TELEMETRY=debug` prints and sends nothing), one batch to `POST /api/usage` with a 1-second limit.
- A README section with a GitHub Actions example.
- The validator is not split into its own npm package yet; that, and the package name, are questions in feature 41. Nothing is published.

## Capabilities

### New Capabilities
- `command-line`: the jclcheck command, its output formats, exit codes and opt-in counting.

### Modified Capabilities

## Impact

- Backend: new `src/cli.js`, `bin/jclcheck.js`; `package.json` gains `bin`.
- Docs: README, Spec.md.
