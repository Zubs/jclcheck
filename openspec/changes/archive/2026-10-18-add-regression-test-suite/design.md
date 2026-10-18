# Design

## Context

- `backend/test/run.js` prints `validate()` output for `valid.jcl`, `broken.jcl` and `proc.jcl` and asserts nothing. `npm test` runs it, so it always exits 0.
- `validate(source)` in `backend/src/validator.js` is synchronous and pure. It returns `{ diagnostics, ast, stats }`, with diagnostics already sorted by line and column. Each diagnostic has `code`, `severity`, `line`, `column`, `length`, `message`, `suggestion` and `source`.
- The backend is CommonJS with no dev dependencies. The local Node is 23.
- The workbench samples live in `frontend/src/samples.js`, an ES module in a `"type": "module"` package, as `SAMPLES = { clean, broken, proc }`, each with a `code` string.
- Today's output was reviewed while writing this design:
  - `valid.jcl` and the `clean` sample give no diagnostics.
  - `broken.jcl` and the `broken` sample give 14 and 12 deliberate diagnostics.
  - `proc.jcl` and the `proc` sample give `JCLR003` and `JCLK001`.
  - None of these are known false results, so they become the starting snapshot.
- The frontend is Vue 3 with Vite 5 and vue-router 4, and has no tests yet.
  - `Workbench.vue` holds the state and calls `validateJcl` from `src/api.js`, 450 ms after the last edit.
  - `Editor.vue`, `ErrorPanel.vue`, `PfBar.vue` and `HelpModal.vue` are presentational.
  - `Editor.vue` exposes `scrollToLine`.
  - `router.js` calls `applyPageSeo` from `seo.js` after each navigation.
- Nick's JCL examples are the code blocks quoted under each feature in Features.md. Items 1, 9, 11 and 20 are about the UI and have no JCL.

See proposal.md for why this is needed, and `specs/regression-testing/spec.md` for the required behaviour.

## Goals / Non-Goals

**Goals:**
- One `npm test` that pins exact diagnostics, with no new dependencies.
- Adding a fixture means dropping in two files, with no test code to write.
- Known gaps are visible as `todo`s and can't silently go stale.
- Later features can write focused tests with `expectDiagnostics(jcl, [...])` for inline JCL.
- Frontend components are tested in a simulated browser, with the same strict handling of known bugs as the backend.

**Non-Goals:**
- Real-browser or cross-browser testing (for example Playwright). The checks in Firefox, Chrome, Safari and Edge that features 26 and 41 call for stay manual.
- Visual or pixel testing. jsdom has no layout engine.
- Running tests in CI. There is no `.github/` workflow today, and adding one is a separate decision.
- Comparing messages, suggestions, `length`, `ast` or `stats` other than `valid`. Feature tests that care about wording assert it directly.
- A command that rewrites expected files from current output. Rewriting from current output would accept bugs as correct; expected files are edited by hand and reviewed.
- Changing any validator behaviour.

## Decisions

### 1. Node's built-in runner, with a glob test command
`"test": "node --test \"test/**/*.test.js\""`, plus `"engines": { "node": ">=22" }`.
- **Why:** it adds no dependency, and its spec reporter already prints pass, fail and todo counts.
- **Why a glob:** a bare `node --test` would also pick up `test/helpers/*.js` and `test/inspect.js` as test files.
- **Alternatives:**
  - Jest or Vitest: new dependencies, which this change avoids.
  - Listing files by hand: easy to forget a new file.

### 2. Compare a multiset of four-field keys
Each diagnostic becomes the key `code|severity|line|column`. Actual and expected lists are compared as multisets, which gives `missing` (expected but not returned) and `unexpected` (returned but not expected).
- **Why:** order doesn't matter, as the spec requires. Duplicates still count, because two identical diagnostics on one line is a real difference. Message wording stays free to change.
- **Alternative:** `assert.deepStrictEqual` on sorted arrays. It works, but it can't name what is missing or unexpected, and its object diff is harder to read than a side-by-side table.

### 3. Helper module API (`backend/test/helpers/diagnostics.js`)
- `compareDiagnostics(actual, expected)` returns `{ ok, missing, unexpected }`. It is pure, so the comparison itself can be unit-tested.
- `formatComparison(actual, expected, result)` prints two aligned columns (EXPECTED | ACTUAL), sorted by line, column and code. Missing entries are marked `-` and unexpected entries `+`.
- `expectDiagnostics(jcl, expected, { valid } = {})` runs `validate`, compares, and throws an `AssertionError` with the formatted table. When `valid` is given, it also checks `stats.valid`.

### 4. Fixture discovery and pairing (`backend/test/helpers/fixtures.js`)
`findFixtures(dir)` walks `dir` recursively. It returns `pairs` (each `.jcl` with its `.expected.json`) and `problems` (a fixture without an expected file, an expected file without a fixture, or an unreadable or malformed expected file).
- `fixtures.test.js` registers one test per pair, and one failing test per problem with a message that names the path.
- The function takes a directory, so its own tests can run against a temporary directory made with `fs.mkdtemp`, without polluting the real fixtures.

### 5. Expected-result file format
```json
{
  "source": "Nick's item 13 (Features.md feature 19)",
  "todo": { "feature": 19, "reason": "Member names in DSN are not understood yet" },
  "provisional": false,
  "valid": true,
  "diagnostics": [
    { "code": "JCLD001", "severity": "warning", "line": 4, "column": 1 }
  ]
}
```
- Only `diagnostics` is required.
- `source` documents where a fixture came from. The JCL itself carries no metadata comment, since a `//*` line before the JOB statement could itself be a JCL problem.
- `provisional: true` marks an expected result that depends on an open question in feature 41.

### 6. Todo handling decided when tests are registered
Because `validate` is synchronous, each fixture is compared while its test is being registered:

| Marked todo? | Matches? | Registered as |
|---|---|---|
| no | yes | a passing test |
| no | no | a failing test with the table |
| yes | no | `test(name, { todo: "feature N: reason" }, ...)`, which throws the table. Node reports it as todo and doesn't fail the run. |
| yes | yes | a failing test: "now passes; remove the todo marker from `<file>`" |

- **Why:** this is the "strict expected failure" behaviour the spec asks for, which Node's `todo` option doesn't provide on its own.
- **Alternative:** plain `{ todo }` on every todo fixture. A fixture fixed by accident would never be noticed.

### 7. Nick's fixtures: names, wrapping and expected results
- Files are named `NN-slug.jcl`, using Nick's item number, under `backend/test/fixtures/nick/`. One item with several alternative statements becomes several files (`07a`, `07b`, `07c`). The two different item 14 examples become `14a` and `14b`.
- Fragments are wrapped as little as possible:
  - `//NICK     JOB` before any fragment without a JOB statement
  - `//STEP1    EXEC PGM=IEFBR14` as well, when the fragment is DD statements
  - Line numbers in the expected file refer to the wrapped file.
- The expected result is what Features.md says the example should give once its feature is built ("checks clean", "exactly one `JCLK004`", "`JCLO005` on line 4"). On top of that come diagnostics that are correct and unrelated to the item, such as `JCLR001` for a catalogued PROC that can't be seen. Codes that don't exist yet (`JCLK004`, `JCLS009`, `JCLO005`) are written as Features.md names them. Their columns are a best estimate until the feature fixes them.

| File | Item | Todo for feature | Expected outcome |
|---|---|---|---|
| `02-continued-comment.jcl` | 2 | 4 (also needs 18) | no `JCLP002` or `JCLK001`. `JCLR001` for `BILLING` stays. |
| `03-continued-quote.jcl` | 3 | 5 | clean |
| `04-multiple-jobs.jcl` | 4 | 10 | clean |
| `05-jobgroup.jcl` | 5 | 22 | clean |
| `06-msglevel.jcl` | 6 | 15 | one warning on `MSGLEVEL=(1,1,1,5)`, from feature 15's S test |
| `07a-notify-too-long.jcl` | 7 | 16 | one `JCLS009` |
| `07b-notify-bad-userid.jcl` | 7 | 16 | one `JCLS009` |
| `07c-notify-node.jcl` | 7 | none: provisional, and already passes today | clean, until feature 41 decides. If the question finds the example invalid, feature 16 changes the expected file. |
| `08-jes2-route.jcl` | 8 | 8 | clean |
| `10-email-on-job.jcl` | 10 | 3 | clean at the default level |
| `12-notify-type.jcl` | 12 | 17 | one `JCLS009` on `TYPE` |
| `13-member-name.jcl` | 13 | 19 | clean |
| `14a-dd-data-jcl.jcl` | 14 | 7 | no errors |
| `14b-notify-email.jcl` | 14 | 17 (provisional on `TYPE=TSO`) | clean |
| `15-dlm.jcl` | 15 | 6 | clean |
| `16-positional-limit.jcl` | 16 | 12 | exactly one `JCLK004` |
| `17-jcllib-placement.jcl` | 17 | 11 | `JCLO005` on line 4. `JCLR001` for `MYPROC2` stays. |
| `18-duplicate-dd.jcl` | 18 | 20 | one `JCLD001` warning, `valid: true` |
| `19-path.jcl` | 19 | 21 | clean |

### 8. Samples read from source, with expected files outside the fixtures tree
`samples.test.js` loads `frontend/src/samples.js` with `await import(pathToFileURL(...))` inside an async test. It registers a subtest for each key in `SAMPLES`. Expected files live in `backend/test/samples/<key>.expected.json`, not under `fixtures/`, so the `.jcl` pairing rule doesn't apply to them. The test also checks that the set of expected files matches the set of sample keys exactly.
- **Alternative:** copying the samples into `.jcl` fixtures. That is simpler, but the copies drift from what the workbench actually shows.

### 9. Keep the printing script
`test/run.js` is renamed to `test/inspect.js` and run with `npm run inspect`. Its output is unchanged. It is still useful for seeing messages and suggestions while working on a rule.

### 10. Frontend tooling: Vitest with jsdom, set up in the existing Vite config
- Dev dependencies: `vitest` (a release line that supports Vite 5), `@vue/test-utils` and `jsdom`.
- A `test` block in `frontend/vite.config.js` sets `environment: 'jsdom'` and `include: ['tests/**/*.test.js']`.
- `"test": "vitest run"` runs once and exits. Plain `vitest` stays available for watch mode.
- **Why:** Vitest reuses the app's Vite and Vue plugin setup, so `.vue` files and `import.meta.env` work in tests exactly as in the build. jsdom handles textarea selection (`selectionStart`, `setSelectionRange`), which the editor tests need, better than happy-dom.
- **Alternatives:**
  - Jest: needs its own transform setup for Vue and Vite.
  - happy-dom: faster, but less complete for form controls.

### 11. Test location and naming
Tests live in `frontend/tests/`, mirroring `src/`: `tests/components/Editor.test.js`, `tests/pages/Workbench.test.js`, `tests/api.test.js`, `tests/seo.test.js` and `tests/router.test.js`.
- **Why:** they stay out of `src/` and out of the production build. The backend also keeps its tests in a separate folder.
- **Alternative:** test files next to the components. That's a common pattern, but it mixes test files into `src/`.

### 12. Isolation
- Component and page tests replace the API module with `vi.mock('../../src/api.js')`.
- `api.test.js` replaces `fetch` with `vi.stubGlobal('fetch', ...)`, and checks the URL, method, headers and body.
- The 450 ms debounce is tested with `vi.useFakeTimers()`.
- Router tests build the app's routes with `createMemoryHistory()`, so they don't depend on `window.location`.
- No test opens a socket. A global `fetch` stub in a setup file throws if it is ever called unexpectedly.

### 13. Known frontend bugs: `test.fails`, named after the feature
For example: `test.fails('shows the cursor column (feature 24)', ...)`. Vitest reports a `test.fails` test as passing while its body fails, and as failing once its body passes. That is the strict expected-failure behaviour of backend decision 6, with no extra code. The feature that fixes the bug turns `test.fails` into `test`.

The three initial expected failures:

| Test | Feature | What it checks |
|---|---|---|
| shows the cursor column | 24 | after moving the cursor to column 16, the editor header shows `COL 16` |
| F5 checks the JCL | 26 | a `keydown` of F5 on the workbench calls the validator once |
| ignores out-of-order replies | 35 | if reply 1 arrives after reply 2, the panel keeps reply 2's diagnostics |

## Risks / Trade-offs

- [Expected results for unbuilt features are guesses about codes and columns.] → They are `todo`, so they can't fail the run. Each feature corrects its fixtures' expected files when it removes the marker. Results that depend on open questions are marked `provisional`.
- [Backend tests reach into `frontend/src/`.] → The path is a single constant. If the file is missing or the export changes shape, the samples test fails with a message naming the path. Nothing in the frontend changes.
- [Snapshotting today's output for the existing fixtures could lock in behaviour that later features change on purpose, such as `JCLD001` becoming a warning in feature 20.] → That is intended. The feature that changes the behaviour updates the expected file in the same change, and the diff shows the change in review.
- [`engines: node >=22` could warn on a host running older Node.] → Node 20 left support in April 2026. `engines` only produces a warning, and the API server itself doesn't use any Node 22 feature.
- [Strict todo handling makes a fix that is "too good" fail the run.] → The failure message says exactly which file to edit, which is the point: the list of known gaps stays true.
- [jsdom has no layout, so `scrollToLine`'s scroll position and the gutter's scroll sync can't be measured.] → Tests check what can be observed in jsdom (the selected range and focus), and leave pixel positions to the manual browser checks.
- [Vitest, Vite and the Vue plugin must stay compatible.] → Pick a Vitest release line that declares Vite 5 support, and upgrade them together.
- [Tests that rely on the exact status texts break when the copy changes.] → That is intended, since the status text is what users see. A copy change updates the test in the same change.

## Migration Plan

This is developer tooling only, and nothing is deployed. The frontend's dev dependencies are not part of the Netlify build output. Rollback means reverting the change, which brings back `test/run.js` as the backend `npm test` and removes the frontend `test` script and dev dependencies.
