# Proposal

## Why

The NOTIFY statement (z/OS 2.3) is passed through unchecked, so Nick's item 12 (`TYPE=EMAILaasdasd`) gets no warning, and `EMAIL=` on the JOB statement accepts any value.

## What Changes

- NOTIFY gets its own keyword table: `EMAIL`, `USER`, `TYPE`, `WHEN`.
  - `EMAIL`: a quoted address of up to 246 characters with exactly one `@` (also used for `EMAIL=` on JOB).
  - `USER`: the user ID rule from feature 16.
  - `TYPE`: `MSG` or `EMAIL`.
  - `WHEN`: a condition in brackets or quotes, parsed with feature 13's condition parser (without `THEN`).
- One of `EMAIL` or `USER` is required (`JCLK002`); both together get the new error `JCLK007`.
- Placement: after the JOB statement and before the first EXEC (`JCLO009`), at most 8 per job (`JCLO010`). The limit of 8 comes from the reference as remembered; feature 41 already asks to confirm placement and limit.
- NOTIFY nodes are kept on the job as `notifies`.
- Nick's item 12 fixture loses its `todo`. The provisional item 14b fixture now expects a `JCLS009` on `TYPE=TSO`; feature 41 records this.

## Capabilities

### New Capabilities

### Modified Capabilities
- `statement-parameters`: NOTIFY statement keywords and the EMAIL address rule.
- `job-structure`: NOTIFY placement and limit.

## Impact

- Backend: `keywords.js`, `valueRules.js`, `conditions.js`, `parser.js`, `ast.js`, `errors.js`, `rules/paramRules.js`.
- Fixtures: `nick/12-notify-type` (todo removed), `nick/14b-notify-email` (gains one warning, stays provisional).
