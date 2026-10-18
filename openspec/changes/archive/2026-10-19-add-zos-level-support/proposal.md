# Proposal

## Why

The validator checks every job against one fixed keyword list, so a keyword that only exists from a given z/OS release (Nick's item 10: `EMAIL=` on the JOB statement, from z/OS 2.3) is reported as unknown. Callers also can't tell which level of the JCL Reference a result follows (Nick's item 11). Almost every later feature adds level-dependent rules, so the level has to exist first.

## What Changes

- Keyword and statement-type lists in `keywords.js` become tables whose entries can carry `since` and `until` z/OS levels. Entries without either are available at every supported level.
- One list of supported levels, `ZOS_LEVELS` (2.3, 2.4, 2.5, 3.1, 3.2), with the newest as the default.
- `EMAIL` is added to the JOB keywords with `since: '2.3'`, and the NOTIFY statement type is marked `since: '2.3'`.
- New warning `JCLK005`: a known keyword or statement that isn't available at the chosen level, either because it arrived later or because it was removed. A misspelt keyword still gets `JCLK001`.
- `POST /api/validate` accepts an optional `zosLevel`. An unknown level gets a 400 response listing the supported levels, and nothing is validated. Every result includes the `zosLevel` it was checked against.
- Nick's item 10 fixture loses its `todo` marker.

## Capabilities

### New Capabilities
- `zos-levels`: choosing the z/OS release JCL is checked against, which keywords and statements are available at each release, and how the API reports the level used.

### Modified Capabilities

## Impact

- Backend: `keywords.js`, `errors.js` (`JCLK005`), `validator.js`, `parser.js`, `rules/paramRules.js`, `index.js`.
- API: new optional request field `zosLevel` and new response field `zosLevel`. Existing callers are unaffected.
- Tests: new unit and API tests, and the item 10 fixture's `todo` is removed.
- Docs: README's API section and Features.md feature 41.
- The workbench doesn't send a level yet; the picker is feature 27.
