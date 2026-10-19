# Tasks

## 1. Counting positionals

- [x] 1.1 Keep empty positionals before the first keyword in `tokenizeParams`, and skip empty ones where a positional is used as a value (parser PROC name, `checkExecRequired`); verify `npm test` still passes with no changed diagnostics
- [x] 1.2 Add `POSITIONAL_LIMITS` and `JCLK004` (error) and check the limit for JOB, EXEC and DD; verify `test/positionals.test.js`: `//J JOB` is clean; `(ACCT)` and `,'NAME'` are clean; item 16 gives one `JCLK004` at column 15 naming JOB, 2 and 15; two positionals pass and three fail; `DD *,DUMMY` fails; a typical JOB is clean; a positional after a keyword still gets `JCLK003`

## 2. JOB positional sizes

- [x] 2.1 Add `JCLS012` and `JCLS013` and check the accounting and name sizes and name quoting; verify a 20-character name passes, 21 gets `JCLS012`, `J/SMITH` gets `JCLS013`, `J.SMITH` passes
- [x] 2.2 Remove the `todo` from `nick/16-positional-limit.expected.json` and set its column to 15; verify it passes

## 3. Docs and progress

- [x] 3.1 In Features.md feature 12, correct "found 16" to "found 15" and record `JCLS012`/`JCLS013`; add them to feature 30's code list; verify the text
- [x] 3.2 Run lint, tests and the build in both packages; verify all pass
- [x] 3.3 Tick feature 12 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
