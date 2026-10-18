# Tasks

## 1. Test command and scripts

- [x] 1.1 Rename `backend/test/run.js` to `backend/test/inspect.js` (output unchanged) and add `"inspect": "node test/inspect.js"` to `backend/package.json`; verify `npm run inspect` prints stats and diagnostics, with messages and suggestions, for all three fixtures and exits 0
- [x] 1.2 Set `"test": "node --test \"test/**/*.test.js\""` and `"engines": { "node": ">=22" }` in `backend/package.json`; verify with a temporary `test/smoke.test.js` that `npm test` runs it and prints pass, fail and todo counts, then delete the smoke file

## 2. Diagnostic comparison helper

- [x] 2.1 Create `backend/test/helpers/diagnostics.js` with `compareDiagnostics(actual, expected)`, which compares multisets of `code|severity|line|column` and returns `{ ok, missing, unexpected }`. Verify with `test/diagnostics-helper.test.js` cases for: a single match passes, a different order passes, a column of 5 vs 6 fails, an extra diagnostic fails and appears in `unexpected`, a missing one fails and appears in `missing`, a duplicate counts twice, and a changed message or suggestion still passes
- [x] 2.2 Add `formatComparison(...)`, which prints EXPECTED | ACTUAL columns sorted by line, column and code, with `-` for missing and `+` for unexpected entries; verify a test asserts the output for a one-missing, one-unexpected case contains both markers and the code, severity, line and column of each entry
- [x] 2.3 Add `expectDiagnostics(jcl, expected, { valid })`, which runs `validate` and throws an `AssertionError` carrying the formatted table, and checks `stats.valid` when `valid` is given; verify tests for empty JCL (`[]`, `valid: true`) pass, and a deliberately wrong expectation throws with the table in its message

## 3. Fixture discovery and todo handling

- [x] 3.1 Create `backend/test/helpers/fixtures.js` with `findFixtures(dir)`, which walks recursively and returns `pairs` and `problems` (missing expected file, orphaned expected file, invalid JSON, no `diagnostics` array); verify with `test/fixtures-helper.test.js`, which builds a temporary directory with `fs.mkdtemp` containing one good pair, one `.jcl` alone, one `.expected.json` alone, one malformed file and one nested pair, and asserts each lands in the right list with a message naming its path
- [x] 3.2 Create `backend/test/fixtures.test.js`, which registers one test for each pair and one failing test for each problem, and applies the todo rules from design decision 6 (todo and failing is reported as todo with the table; todo and passing fails with "remove the todo marker from `<file>`"); verify against temporary fixtures that each of the four combinations in the design table gives the stated result and exit status
- [x] 3.3 Add `valid.expected.json`, `broken.expected.json` and `proc.expected.json` next to the existing fixtures, recording today's reviewed output (none, 14 and 2 diagnostics) with code, severity, line and column, plus `valid`; verify `npm test` passes them and that editing one expected column makes `npm test` exit non-zero with the side-by-side table

## 4. Workbench samples

- [x] 4.1 Create `backend/test/samples.test.js`, which imports `frontend/src/samples.js` with `pathToFileURL` and dynamic `import()`, registers a subtest for each `SAMPLES` key, fails with a message naming the key when a sample has no expected file or an expected file has no sample, and fails with a message naming the path when the module can't be loaded; verify by temporarily renaming one expected file (fails, naming the sample) and then restoring it
- [x] 4.2 Add `backend/test/samples/clean.expected.json`, `broken.expected.json` and `proc.expected.json`, recording today's reviewed output (none, 12 and 2 diagnostics); verify `npm test` passes all three

## 5. Nick's examples

- [x] 5.1 Create the files in `backend/test/fixtures/nick/` for items 2, 3, 4, 5, 6, 8, 10, 13, 14a, 14b, 15 and 19, copying each example's JCL from Features.md and wrapping fragments as design decision 7 describes. Each expected file has `source`, `todo` with the feature from the design table, and the "clean" or "no errors" result, keeping only correct unrelated diagnostics such as `JCLR001`. Verify `npm test` reports each one as todo and the run still passes
- [x] 5.2 Create the files for items 7a, 7b, 7c, 12, 16, 17 and 18, whose expected results contain diagnostics (`JCLS009`, `JCLK004`, `JCLO005`, `JCLD001` warning), with severity and line from Features.md and a best-estimate column. Mark 7c and 14b `provisional`; 14b is todo for feature 17, and 7c is a normal test because it already passes (see the design table). Verify `npm test` reports each one as todo and the run still passes
- [x] 5.3 Check that Nick's coverage is complete: every code block under a feature whose **From the feedback** names an item has a fixture, and no fixture lacks a `source`; verify by listing `fixtures/nick/` against the design table (19 files)

## 6. Frontend test setup

- [x] 6.1 Add `vitest` (a release line that supports Vite 5), `@vue/test-utils` and `jsdom` as frontend dev dependencies, add `"test": "vitest run"` to `frontend/package.json`, and add a `test` block to `frontend/vite.config.js` (`environment: 'jsdom'`, `include: ['tests/**/*.test.js']`, a setup file); verify a temporary `tests/smoke.test.js` that mounts `PfBar.vue` passes under `npm test`, then delete it
- [x] 6.2 Create the setup file `frontend/tests/setup.js`, which stubs global `fetch` to throw "unexpected network call"; verify a temporary test that calls `fetch` fails with that message, then delete it, and verify `npm run build` still succeeds with no test files in `dist/`

## 7. Frontend tests

- [x] 7.1 Write `tests/components/Editor.test.js`: one gutter row per line (with at least one row for empty text), highest severity wins on a line, hover title lists all of that line's messages, input emits `update:modelValue`, Tab inserts two spaces at the cursor, and `scrollToLine(2)` selects line 2's text; verify all pass
- [x] 7.2 Write `tests/components/ErrorPanel.test.js`: ERR and WARN counts, the `VALIDATING…` state, the empty state ("NO PROBLEMS FOUND" and "5 statements · 2 steps checked clean.", and the procs text when `procCount > 0`), an entry showing `WARN`, `L4:26`, `JCLK001`, the message and `FIX ›` with the suggestion, no FIX line without a suggestion, and a click emitting `select` with the diagnostic; verify all pass
- [x] 7.3 Write `tests/components/PfBar.test.js` and `tests/components/HelpModal.test.js`: each key renders its F-key and label and emits its event on click, and help emits `close` from the ✕ button and from a backdrop click, but not from a click inside the dialog; verify all pass
- [x] 7.4 Write `tests/pages/Workbench.test.js` with the API mocked and fake timers: one check on mount with the clean sample; three edits 100 ms apart send one check 450 ms after the last, with the latest text; status texts `VALIDATING`, `CLEAN — 0 ERRORS`, `2 ERRORS`, `1 ERROR` and `API UNREACHABLE`; SAMPLE cycles broken → PROC → clean; CLEAR empties the editor; HELP opens help and close hides it; selecting a diagnostic calls the editor's `scrollToLine` with its line; verify all pass
- [x] 7.5 Write `tests/api.test.js` with `fetch` stubbed: POST to `/api/validate` with the `Content-Type: application/json` header and body `{"source":...}`, the JSON result returned on 200, and an error containing the status and body text on 500; verify all pass
- [x] 7.6 Write `tests/seo.test.js` and `tests/router.test.js`: `applyPageSeo` sets the title, description, Open Graph and Twitter tags and the canonical address, and updates existing tags instead of adding duplicates; navigating with memory history to `/`, `/about` and `/app` applies each route's title, and `/about` gives `About · JCLcheck` and `https://jclcheck.xyz/about`; verify all pass
- [x] 7.7 Add the three expected failures from design decision 13 as `test.fails`, each naming its feature: cursor column (feature 24) in `Editor.test.js`, F5 key (feature 26) and out-of-order replies (feature 35) in `Workbench.test.js`; verify `npm test` passes, and that removing `.fails` from one of them makes `npm test` exit non-zero

## 8. Documentation

- [x] 8.1 Update `README.md`: change the project-tree line for `test/` to describe the regression suite, and replace the "Backend tests" section with backend `npm test` (exact diagnostics, todo fixtures, Node 22 or later), `npm run inspect`, and how to add a fixture (a `.jcl` file plus an `.expected.json` file in the documented format); add a "Frontend tests" section with `npm test`, watch mode (`npx vitest`), where tests live, and how expected failures work; verify each documented command runs as written
- [x] 8.2 Update `Features.md`:
  - remove the "Frontend test runner (feature 1)" question from feature 41
  - reword feature 1's frontend bullet to say that Vitest, Vue Test Utils and jsdom are used, and that real-browser checks stay manual
  - change feature 35's "(scripted browser runs until a frontend test runner is approved, see feature 41)" to say its tests use Vitest
  - change feature 41's final check about features 23–29 so it says only cross-browser checks are done by hand

  Verify no text in `Features.md` still says the frontend test runner is waiting for approval.
- [x] 8.3 Tick feature 1 in the Progress list of `Features.md` only after group 9 passes; verify the box is ticked and the feature's **Done when** holds

## 9. Integration checks

- [x] 9.1 Run `npm install && npm test` in `backend/` on Node 22 or later with no other packages; verify it exits 0, the summary shows the pass and todo counts (18 todo; 07c is a normal provisional test), and `package.json` gained no dependency
- [x] 9.2 Temporarily break a rule (for example remove `'TIME'` handling in `checkParamValues`) and run `npm test`; verify it exits non-zero and names exactly the `broken` fixture and the `broken` sample, with the missing `JCLS005` shown in the table; then revert and verify `npm test` exits 0 again
- [x] 9.3 Run `npm install && npm test` in `frontend/` with the backend stopped and no network; verify it exits 0, and that the three expected failures show as passing
- [x] 9.4 Temporarily change the clean status text in `Workbench.vue` and run the frontend `npm test`; verify it exits non-zero and names only the status-text test; then revert and verify it exits 0 again
