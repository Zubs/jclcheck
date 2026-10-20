# Tasks

## 1. Parser and validator

- [x] 1.1 Build `jobs` in the parser with `//` ending a job, `JCLO007` for statements after it, PROCs attached to their job (pre-job PROCs to the first job), and remove `JCLO004`; verify `test/jobs.test.js`: no JOB gives one `JCLO001`; one job has `jobCount` 1; item 4 has two jobs and no diagnostics; `//` at the end is clean; `//` then a JOB starts job 2 cleanly; EXEC after `//` gets `JCLO007`
- [x] 1.2 Run the rules per job in the validator (PROC resolution per job, symbolic checks once), return `ast.jobs`, `jobCount` and summed `stepCount`, and judge JES placement per job; verify tests: same STEP1/SYSUT1 in two jobs gives no duplicates; a job-2 diagnostic points to its line and `stepCount` totals; job 2 calling job 1's PROC gets `JCLR001`; a pre-job PROC resolves; three jobs report each mistake on its line; `/*PRIORITY` before job 2 is clean
- [x] 1.3 Update tests that read `ast.job` to `ast.jobs[0]`, and the feature 7 `DD *` test, whose nested JOB now starts a second job; remove the `todo` from `nick/04-multiple-jobs.expected.json`; verify `npm test` passes

## 2. Docs and progress

- [x] 2.1 Update Spec.md's API row (`ast.jobs`, `jobCount`) and add a README note on the `ast.jobs` change; verify the text
- [x] 2.2 Run lint, tests and the build in both packages; verify all pass
- [x] 2.3 Tick feature 10 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
