# Proposal

## Why

Feature 41's questions were answered on 19 October 2026. Sixteen answers need code changes.

## What Changes

- NOTIFY: `NOTIFY=node.userid` on the JOB statement gets a warning (only `USER=` on the NOTIFY statement takes it); NOTIFY statements may come anywhere after the JOB statement, at most 8; the 1–8 character rule cites the JCL Reference.
- **Behaviour change:** `JCLD001` says the first DD with the name is used.
- **Behaviour change:** an in-stream PROC before the first JOB statement is an error; the "PROC + SYMBOLICS" sample moves its PROC after the JOB statement.
- `since`/`until` level marks for keywords, from the JCL Reference's summaries of changes.
- JCL sent to the internal reader is checked as its own job stream.
- `^` and `!` are read as NOT in IF conditions, with a warning.
- Value rules for the job group keywords.
- Diagnostics underline the whole parameter or value they are about.
- A `WHEN=` condition over several lines is reported at each character's own line and column.
- Dataset flow applies DD overrides without a procedure step name, and checks `DCB=*.STEP.DD` referbacks.
- A form for the site profile in the workbench, with the JSON as an advanced view.
- Exact IBM JCL Reference page links for keywords.
- The validator moves into its own dependency-free package in the repository, used by the API and the CLI (not published).
- The CLI expands globs itself instead of with `fs.globSync`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `statement-parameters`, `job-structure`, `dd-statement-rules`, `dataset-flow`, `suppressions-profile`, `keyword-explanations`, `command-line`, `zos-levels`

## Impact

- Backend, frontend, fixtures and docs; a new `validator/` package.
