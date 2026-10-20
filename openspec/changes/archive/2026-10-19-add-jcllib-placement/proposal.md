# Proposal

## Why

JCLLIB is passed through unchecked, so one placed after the first EXEC (Nick's item 17) isn't reported, although z/OS rejects it. Its `ORDER=` libraries are also the best hint about where an unresolved PROC may live.

## What Changes

- JCLLIB becomes a node on its job, holding its `ORDER=` libraries.
- New ordering errors: `JCLO005` (JCLLIB must come after the JOB statement and before the first EXEC), `JCLO006` (only one JCLLIB per job), `JCLO008` (JCLLIB is not allowed inside an in-stream PROC).
- `ORDER=` is required (`JCLK002`) and is JCLLIB's only keyword (`JCLK001` otherwise); each library is checked with the DSN rules.
- `JCLR001` names the job's JCLLIB libraries when it has them, e.g. "…may be found in CAMPBEL.PROCS.JCL or 3 other libraries". It stays a warning.
- Nick's item 17 fixture loses its `todo`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `job-structure`: adds JCLLIB placement and contents.

## Impact

- `backend/src/parser.js`, `ast.js`, `keywords.js`, `errors.js`, `rules/paramRules.js`, `rules/procRules.js`.
- Features.md feature 11 records `JCLO008`.
