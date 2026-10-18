# regression-testing Specification

## Purpose

Checks the JCL validator against exact expected diagnostics, and the web frontend's components against their expected behaviour, so that a change that breaks either is caught before it ships.

## Requirements

### Requirement: Exact diagnostic comparison
A test SHALL compare the validator's diagnostics with an expected list on four fields only: code, severity, line and column. The test SHALL pass only when both lists hold the same diagnostics, in any order. Messages and suggestions SHALL NOT be compared.

#### Scenario: Matching single diagnostic
- **WHEN** a test expects one diagnostic and the validator returns exactly that diagnostic
- **THEN** the test passes

#### Scenario: Empty input
- **WHEN** a test checks empty JCL against an empty expected list
- **THEN** the test passes, and the result reports `valid: true`

#### Scenario: Column differs by one
- **WHEN** the validator returns a diagnostic that matches the expected one except for its column (5 instead of 6)
- **THEN** the test fails

#### Scenario: Extra diagnostic
- **WHEN** the validator returns every expected diagnostic plus one more
- **THEN** the test fails and names the unexpected diagnostic

#### Scenario: Missing diagnostic
- **WHEN** the validator returns one fewer diagnostic than expected
- **THEN** the test fails and names the missing diagnostic

#### Scenario: Message wording changes
- **WHEN** a diagnostic's message or suggestion text changes, but its code, severity, line and column do not
- **THEN** the test still passes

#### Scenario: Same diagnostics in a different order
- **WHEN** the validator returns the expected diagnostics in a different order
- **THEN** the test passes

### Requirement: Readable failure output
A failing comparison SHALL show the expected and actual diagnostics side by side, each with its code, severity, line and column, and SHALL mark which entries are missing and which are unexpected.

#### Scenario: Failure shows both lists
- **WHEN** a comparison fails
- **THEN** the output lists the expected and actual diagnostics side by side, with code, severity, line and column, and marks the missing and unexpected entries

### Requirement: Fixture pairing
Every `.jcl` file under the backend test fixtures directory, including its subdirectories, SHALL be checked against an expected-result file with the same name and the extension `.expected.json`. A fixture without an expected-result file SHALL fail, and so SHALL an expected-result file without a fixture.

#### Scenario: Fixture with expected file
- **WHEN** `valid.jcl` and `valid.expected.json` both exist
- **THEN** `valid.jcl` is checked against the diagnostics listed in `valid.expected.json`

#### Scenario: Missing expected file
- **WHEN** a `.jcl` fixture has no matching `.expected.json` file
- **THEN** the run fails with a message naming the fixture and the expected-result file it needs

#### Scenario: Orphaned expected file
- **WHEN** an `.expected.json` file has no matching `.jcl` fixture
- **THEN** the run fails with a message naming the orphaned file

#### Scenario: Malformed expected file
- **WHEN** an expected-result file is not valid JSON or has no `diagnostics` list
- **THEN** that fixture fails with a message naming the file and the problem, and the other fixtures still run

### Requirement: Known failures marked as todo
An expected-result file MAY mark its fixture as `todo`, giving the reason and the feature that will make it pass. A `todo` fixture that doesn't match SHALL be reported as todo without failing the run. A `todo` fixture that does match SHALL fail the run, with a message saying to remove the marker.

#### Scenario: Todo fixture still failing
- **WHEN** a fixture marked `todo` for feature 4 doesn't match its expected diagnostics
- **THEN** it is reported as todo with its reason and the differences, and the run does not fail because of it

#### Scenario: Todo fixture now passing
- **WHEN** a fixture marked `todo` matches its expected diagnostics
- **THEN** the run fails with a message telling the developer to remove the `todo` marker from that expected-result file

### Requirement: Coverage of Nick's examples
Each JCL example from Nick's review quoted in Features.md SHALL be a fixture. Its expected result SHALL be the outcome Features.md describes for it, and it SHALL be marked `todo` with the addressing feature until that feature is built. An example that is only a fragment SHALL be wrapped in a minimal job so that only the behaviour under test is reported.

#### Scenario: Example addressed by a later feature
- **WHEN** Nick's item 16 example (`//CLEAN JOB ,,,,,,,,,,,,,,,MSGLEVEL=(1,1)`) is run before feature 12 is built
- **THEN** it is reported as todo for feature 12, with its expected result of exactly one `JCLK004`

#### Scenario: Fragment example
- **WHEN** Nick's item 13 example is a single DD statement
- **THEN** its fixture contains a JOB statement and an EXEC statement before the DD, and its expected result has no diagnostics about the added statements

#### Scenario: Example whose result is still being confirmed
- **WHEN** an example's result depends on a question in feature 41 (for example `NOTIFY=N1.IBMUSER`)
- **THEN** its expected result says it is provisional, and it is marked `todo` only if today's validator doesn't already give that provisional result

#### Scenario: Provisional example that already passes
- **WHEN** a provisional example's expected result matches today's output (`NOTIFY=N1.IBMUSER` with no diagnostics)
- **THEN** it is a normal, non-todo test that pins today's result until the open question is answered

### Requirement: Coverage of workbench samples
Each sample offered by the workbench SHALL be checked against an expected-result file. The test SHALL read the samples from the frontend's own sample list, not from a copy. A sample without an expected-result file, or an expected-result file without a sample, SHALL fail.

#### Scenario: Sample checked from its source
- **WHEN** the "broken" sample in the workbench's sample list changes
- **THEN** its test checks the new text without any fixture being copied

#### Scenario: New sample without expected file
- **WHEN** a sample is added to the workbench without an expected-result file
- **THEN** the run fails with a message naming the sample

### Requirement: Backend test command and exit status
Running `npm test` in the backend SHALL run every test in one call and print how many tests passed, failed and are todo. It SHALL exit with a non-zero status when any non-todo test fails, and with zero otherwise. It SHALL need no dependency beyond Node itself.

#### Scenario: All tests pass
- **WHEN** every non-todo test passes
- **THEN** `npm test` exits with status 0 and prints the pass, fail and todo counts

#### Scenario: A rule change breaks a fixture
- **WHEN** a developer changes a rule so that one fixture's diagnostics change, and then runs `npm test`
- **THEN** `npm test` exits with a non-zero status and names exactly the fixtures whose diagnostics changed

#### Scenario: Fresh install
- **WHEN** `npm install` and `npm test` are run in the backend on Node 22 or later
- **THEN** the tests run with no extra packages installed

### Requirement: Inspecting validator output
Developers SHALL still be able to print the validator's full output for the bundled fixtures, without running assertions, through a separate command.

#### Scenario: Inspect command
- **WHEN** a developer runs `npm run inspect` in the backend
- **THEN** each bundled fixture's stats and diagnostics are printed, including messages and suggestions, and the command exits with status 0

### Requirement: Frontend test command and exit status
Running `npm test` in the frontend SHALL run every component test once in a simulated browser and print how many tests passed and failed. It SHALL exit with a non-zero status when any test fails, and with zero otherwise. Tests SHALL make no network requests, SHALL NOT load the real analytics script, and SHALL NOT need the backend to be running.

#### Scenario: All frontend tests pass
- **WHEN** every frontend test passes
- **THEN** `npm test` in the frontend exits with status 0 and prints the counts

#### Scenario: A component change breaks a test
- **WHEN** a developer changes the workbench's status text for a clean result, and then runs `npm test` in the frontend
- **THEN** it exits with a non-zero status and names the failing test

#### Scenario: Backend not running
- **WHEN** the frontend tests run with no backend listening and no network access
- **THEN** they all run and no test tries to reach the API

#### Scenario: Analytics script never loaded
- **WHEN** the frontend tests run
- **THEN** no test adds GoatCounter's script to the page, and analytics tests use a fake GoatCounter instead

### Requirement: Editor behaviour is covered
Frontend tests SHALL check that the editor shows one gutter row per line, marks a line with the highest severity among its diagnostics, shows that line's messages on hover, reports typed text to its parent, inserts two spaces when Tab is pressed, and selects a line when asked to go to it.

#### Scenario: Highest severity wins
- **WHEN** line 3 has a warning and an error
- **THEN** the gutter marks line 3 as an error, and its hover text contains both messages

#### Scenario: Tab inserts spaces
- **WHEN** the cursor is after `//` and Tab is pressed
- **THEN** the editor reports the text with two spaces inserted at the cursor, and focus stays in the editor

#### Scenario: Go to a line
- **WHEN** the editor is asked to go to line 2
- **THEN** the text of line 2 is selected

### Requirement: Diagnostics panel behaviour is covered
Frontend tests SHALL check that the diagnostics panel shows the error and warning counts, a `VALIDATING…` state while loading, an empty state with the statement, step and procedure counts when there are no problems, and an entry for each diagnostic showing its severity, `L<line>:<column>`, code, message and fix. Clicking an entry SHALL select it.

#### Scenario: Diagnostic entry
- **WHEN** the panel receives a warning `JCLK001` at line 4, column 26, with a suggestion
- **THEN** it shows `WARN`, `L4:26`, `JCLK001`, the message and `FIX ›` followed by the suggestion

#### Scenario: Clicking an entry
- **WHEN** a diagnostic entry is clicked
- **THEN** the panel emits a selection carrying that diagnostic

#### Scenario: No problems
- **WHEN** the panel receives no diagnostics and stats with 5 statements, 2 steps and 0 procs
- **THEN** it shows "NO PROBLEMS FOUND" and "5 statements · 2 steps checked clean."

### Requirement: Workbench flow is covered
Frontend tests SHALL check the workbench with the API replaced by a fake: it checks the JCL once on opening, checks again 450 ms after the last edit, shows the right status text, cycles through samples, clears the editor, opens and closes help, and goes to a diagnostic's line when it is selected.

#### Scenario: Debounced check
- **WHEN** the user makes three edits 100 ms apart
- **THEN** exactly one check is sent, 450 ms after the last edit, carrying the latest text

#### Scenario: Status texts
- **WHEN** a check is in flight, returns clean, returns 2 errors, or fails
- **THEN** the status shows `VALIDATING`, `CLEAN — 0 ERRORS`, `2 ERRORS` or `API UNREACHABLE` respectively

#### Scenario: Cycling samples
- **WHEN** the SAMPLE button is pressed three times
- **THEN** the editor shows the broken sample, then the PROC sample, then the clean sample again

### Requirement: API client and page metadata are covered
Frontend tests SHALL check that the API client posts the JCL as JSON to the validate endpoint and raises an error carrying the status when the response isn't OK. They SHALL also check that each route sets its page title, description, canonical address and social tags.

#### Scenario: Request shape
- **WHEN** the client validates the text `//J JOB`
- **THEN** it sends a POST to `/api/validate` with the JSON body `{"source":"//J JOB"}`

#### Scenario: Server error
- **WHEN** the API answers with status 500
- **THEN** the client raises an error whose message contains `500`

#### Scenario: Route metadata
- **WHEN** the app navigates to `/about`
- **THEN** the document title is `About · JCLcheck` and the canonical address is `https://jclcheck.xyz/about`

### Requirement: Known frontend bugs tracked as expected failures
A frontend bug that Features.md schedules for a later feature SHALL have a test that describes the correct behaviour, is named after that feature, and is expected to fail. While it fails, the run SHALL pass. Once it passes, the run SHALL fail until the expected-failure marker is removed.

#### Scenario: Bug still present
- **WHEN** the editor still shows `COL 1` after the cursor moves to column 16 (feature 24)
- **THEN** that expected-failure test is reported as passing, and the run passes

#### Scenario: Bug fixed
- **WHEN** feature 35 is built and out-of-order replies no longer show stale results
- **THEN** its expected-failure test fails the run until its marker is removed

#### Scenario: Initial expected failures
- **WHEN** the frontend tests first run
- **THEN** there are expected-failure tests for the cursor column (feature 24), the F5 key (feature 26) and stale results (feature 35)
