# Tasks

## 1. Rules

- [x] 1.1 NOTIFY: cite the reference for 1–8, warn on `node.userid` in JOB `NOTIFY=` (update `nick/07c-notify-node`), allow NOTIFY anywhere after JOB (max 8); JCLD001 names the first DD; verify tests
- [x] 1.2 PROC before the first JOB is an error; fix the "PROC + SYMBOLICS" sample and its expected results; verify tests
- [x] 1.3 `^` and `!` as NOT with a warning; job group value rules; verify tests
- [x] 1.4 Whole-parameter lengths on diagnostics; WHEN positions over several lines; verify tests
- [x] 1.5 Dataset flow: unqualified overrides and DCB referbacks; verify tests
- [x] 1.6 Check internal reader JCL as its own job stream; verify tests
- [x] 1.7 Level marks from the JCL Reference; verify tests

## 2. Workbench and links

- [x] 2.1 Profile form with a JSON view; verify tests
- [x] 2.2 Exact IBM reference links; verify tests

## 3. Packaging

- [ ] 3.1 Validator package used by the API and CLI; built-in glob matcher; verify tests

## 4. Checks and docs

- [ ] 4.1 Update README, Spec.md and feature 41; run lint, tests and the build in all packages; verify all pass

## Workflow follow-up

- Archive the change and sync its specs.
