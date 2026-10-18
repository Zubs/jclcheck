# Proposal

## Why

`npm test` in `backend/` runs `test/run.js`, which only prints the validator's output for three fixtures and always exits 0. Nothing fails when a rule changes, so a fix to one rule can quietly break another or add new false positives. The frontend has no tests at all. Almost every later feature in Features.md (2–41) changes diagnostics, and each one needs a way to prove it changed only what it meant to. This is feature 1 because the others depend on it.

## What Changes

- `npm test` in `backend/` runs real tests with Node's built-in test runner (`node:test`, `node:assert`). No new dependency is added.
- A shared helper, `expectDiagnostics(jcl, expected)`, runs `validate()` and compares the result with an expected list of `{ code, severity, line, column }`. A missing diagnostic, an extra diagnostic, or a difference in any of those four fields fails the test. Failures print the expected and actual lists side by side.
- Fixture tests are discovered automatically. Every `.jcl` file under `backend/test/fixtures/` must have a matching `.expected.json` file. If one is missing, that fails the run with a clear message.
- Expected files can mark a fixture as `todo` and name the feature that will make it pass. A `todo` fixture that fails is reported but doesn't fail the run. A `todo` fixture that starts passing fails the run and says to remove the marker, so the list of known gaps stays accurate.
- Each of Nick's JCL examples quoted in Features.md is saved under `backend/test/fixtures/nick/`. Each one is marked `todo` with the feature that addresses it.
- The existing `valid.jcl`, `broken.jcl` and `proc.jcl` fixtures, and the three workbench samples in `frontend/src/samples.js`, get expected files that record today's output after it has been reviewed. The samples are read straight from `samples.js`, so a changed sample can't drift away from its test.
- **BREAKING (developer workflow only):** `npm test` now exits non-zero when a non-`todo` test fails. The old printing script stays available as `npm run inspect`.
- `npm test` in `frontend/` runs component tests with Vitest, Vue Test Utils and jsdom. They cover today's editor, diagnostics panel, PF-key bar, help, workbench flow, API client, SEO helper and route metadata. The API is mocked, so the tests make no network calls.
- Frontend bugs already scheduled in Features.md become expected-failure tests: "COL 1" never changes (feature 24), F5 does nothing from the keyboard (feature 26), and stale results (feature 35). Like the backend todos, an expected failure that starts passing fails the run.

## Capabilities

### New Capabilities
- `regression-testing`: how the project is checked for regressions.
  - Backend: the validator is checked against exact expected diagnostics, covering the comparison helper, fixture discovery and pairing, `todo` handling, workbench sample coverage, failure reporting and the exit status of `npm test`.
  - Frontend: component tests run in a simulated browser, known bugs are tracked as expected failures, and the frontend `npm test` has its own exit status.

### Modified Capabilities
<!-- None: openspec/specs/ is empty, and validator behaviour does not change. -->

## Impact

- **Code:**
  - New files under `backend/test/`: a helper module, test files and expected-result files.
  - `backend/test/run.js` is renamed to `backend/test/inspect.js`.
  - The validator in `backend/src/` doesn't change.
- **Scripts:**
  - `backend/package.json` `test` becomes `node --test "test/**/*.test.js"`, and a new `inspect` script is added.
  - An `engines` field records Node 22 or later, which is needed for glob patterns in `node --test`.
- **Frontend code:**
  - New test files under `frontend/tests/`.
  - A `test` block in `frontend/vite.config.js`.
  - A `test` script in `frontend/package.json`.
  - The app code in `frontend/src/` doesn't change.
- **Dependencies:**
  - Backend: none added.
  - Frontend: `vitest`, `@vue/test-utils` and `jsdom` are added as dev dependencies. They are approved, which settles the "Frontend test runner" question in Features.md feature 41.
- **Cross-package read:** backend tests import `frontend/src/samples.js`, which is an ES module, using dynamic `import()`. Nothing in the frontend changes.
- **Later features:** each feature from 2 onwards adds or updates fixtures and frontend tests, and removes the `todo` markers and expected failures it resolves.
