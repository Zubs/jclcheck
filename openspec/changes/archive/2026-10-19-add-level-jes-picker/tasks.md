# Tasks

## 1. Backend

- [x] 1.1 Add `GET /api/levels` and document it in Spec.md's API table; verify `test/api.test.js` checks the levels, `jes3` flags and defaults

## 2. Workbench

- [x] 2.1 Add `getLevels()` and the `zosLevel`/`jes` options to `api.js`; verify `tests/api.test.js` checks the request body and the levels call
- [x] 2.2 Add the level and JES pickers to `Workbench.vue`: load levels before the first check, read the address then storage, fall back with notices, save to storage (try/catch) and `history.replaceState`, re-check on change, count `level/` and `jes/`, and switch JES3 to JES2 at 3.x with a notice; drop the `feature: 27` markers; update test mocks and call expectations; verify Workbench tests for first visit, 2.3, oldest/newest, JES3 at 2.5 then 3.1, `?zos=2.5&jes=JES3`, `?zos=9.9`, blocked storage, and no page view on change
- [x] 2.3 Show "Z/OS N · JES" from the result in `ErrorPanel.vue`; verify a test

## 3. Checks and progress

- [x] 3.1 Run lint, tests and the build in both packages; verify all pass
- [x] 3.2 Tick feature 27 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
