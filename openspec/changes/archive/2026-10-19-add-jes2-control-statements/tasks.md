# Tasks

## 1. Recognise JES2 statements

- [x] 1.1 Add `JES2_STATEMENTS` (with placement marks) to `keywords.js` and make the lexer emit `JES2` entries for `/*` + letter or `$` outside in-stream data; verify `test/jes2.test.js`: a job without JES2 statements is unchanged; `/*ROUTE PRINT NODE1` after JOB is clean; `/*$VS,'D A'` is clean; `/*ROUTE` inside `DLM=$$` data is data; `/*` + blank still ends `DD *` data; item 8 is clean

## 2. Checks

- [x] 2.1 Add `JCLJ001`–`JCLJ003`, default `JCLJ` to warning, and implement `rules/jesRules.js` called from the validator; verify tests: `/*ROUTEE` gets `JCLJ001` at column 3 with "Did you mean 'ROUTE'?"; `/*ROUTE`, `/*ROUTE PRNT NODE1` and `/*ROUTE PRINT` get `JCLJ002`; ROUTE before JOB gets `JCLJ003` and no `JCLL001`; PRIORITY after JOB gets `JCLJ003`, before JOB is clean; a production job with `/*JOBPARM` and `/*ROUTE` is clean
- [x] 2.2 Remove the `todo` from `nick/08-jes2-route.expected.json`; verify it passes

## 3. Docs and progress

- [x] 3.1 Add the `JCLJ` group to the Help dialog's code table and note JES2 statements under "What gets checked"; verify frontend tests and lint pass
- [x] 3.2 Run lint, tests and the build in both packages; verify all pass
- [x] 3.3 Tick feature 8 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
