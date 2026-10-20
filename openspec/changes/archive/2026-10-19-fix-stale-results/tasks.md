# Tasks

## 1. Newest result only

- [x] 1.1 Pass an optional `signal` from `validateJcl` to `fetch`; verify an `api.test.js` test sees the signal
- [x] 1.2 Abort the check in flight and number checks in `runValidation`, ignoring older replies and failures and keeping `loading` until the newest finishes; verify the feature 35 `test.fails` passes as a normal test, plus tests for opening, one edit, five out-of-order edits, an edit as a reply arrives, VALIDATING until the newest reply, and a failing newest check

## 2. Checks and progress

- [x] 2.1 Run lint, tests and the build in both packages; verify all pass
- [x] 2.2 Tick feature 35 in the Features.md Progress list; verify the box is ticked

## Workflow follow-up

- Archive the change and sync its specs.
