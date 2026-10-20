# Tasks

## 1. Internal reader note

- [x] 1.1 Add `JCLD004` and report it from `ddRules` for a DD whose in-stream data has a JOB statement when the step has a `SYSOUT=(class,INTRDR)` DD; verify `test/dd-data.test.js`: empty `DD DATA` is clean; one `//` line stays data; item 14 has no `JCLO004`/`JCLL001`, no errors, two DDs, and one `JCLD004` info on line 3; the same lines under `DD *` end at the first `//`; no INTRDR or no JOB line gives no note; missing `/*` gives `JCLL006`; an IEBGENER submit job has no errors or warnings
- [x] 1.2 Add the `JCLD004` info to `nick/14a-dd-data-jcl.expected.json`; verify `npm test` passes

## 2. Checks and progress

- [x] 2.1 Run lint, tests and the build in both packages; verify all pass
- [x] 2.2 Tick feature 7 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
