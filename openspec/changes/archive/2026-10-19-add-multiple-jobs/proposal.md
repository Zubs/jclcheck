# Proposal

## Why

A job stream may hold several jobs, and JES checks each one separately (Nick's item 4). The parser allows one JOB statement and reports `JCLO004` for the rest. The `//` null statement, which ends a job, doesn't end anything today.

## What Changes

- The parser builds a list of jobs. A JOB statement starts a new job; `//` ends the current one.
- Rules run per job: DD rules, parameter rules and PROC resolution stay inside their own job. JES placement is judged against the nearest JOB statement.
- An in-stream PROC belongs to the job it's written in; one written before the first JOB belongs to the first job (the bundled "PROC + SYMBOLICS" sample does this; feature 41 already asks whether z/OS accepts it).
- New error `JCLO007` for a statement after `//` and before the next JOB.
- **BREAKING (API):** `ast.jobs` replaces `ast.job`. `stats` gains `jobCount`; `stepCount` is the total across jobs. The frontend doesn't read `ast.job`.
- `JCLO004` is removed from the catalog.
- Nick's item 4 fixture loses its `todo`.

## Capabilities

### New Capabilities
- `job-structure`: how a job stream divides into jobs and steps, and where statements may appear.

### Modified Capabilities

## Impact

- Backend: `parser.js`, `validator.js`, `rules/procRules.js`, `rules/jesRules.js`, `errors.js`; tests that read `ast.job`.
- Docs: Spec.md API row, README note, Help copy if it mentions one job.
