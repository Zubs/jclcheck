# Design

## Context

`parser.js` treats JCLLIB as a no-op. Since feature 10, the parser tracks the current `job` and `procStack`; a job's `steps` is empty until its first EXEC.

## Decisions

1. **Placement in the parser.** On JCLLIB: inside a PROC → `JCLO008`; no current job, or the job already has steps → `JCLO005`; the job already has a JCLLIB → `JCLO006`. Otherwise (and also when misplaced but the job has none yet) the node `{ type: 'Jcllib', line, params }` is stored as `job.jcllib`, so its libraries still inform `JCLR001`.
2. **Contents in `paramRules`.** `checkAllParams` checks `job.jcllib` with `checkKeywords` against a `JCLLIB_KEYWORDS` table (`ORDER`), reports `JCLK002` without `ORDER`, and runs `checkDsn` on each `ORDER` entry (the sub-values, or the single value).
3. **`JCLR001` libraries.** `resolveProcCalls` passes `libraries` from `job.jcllib`; the catalog message appends "It may be found in X or N other libraries." when present.
4. **Code `JCLO008`.** Features.md names only `JCLO005`/`JCLO006`; the PROC case needs its own message.
