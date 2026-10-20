# Tasks

## 1. Levels and tables

- [x] 1.1 Create `backend/src/levels.js` with `ZOS_LEVELS`, `DEFAULT_ZOS_LEVEL`, `isZosLevel`, `compareLevels` and `availability(entry, level)`; verify `test/levels.test.js` covers: default is 3.2; `since` at the same level and later is available; one level earlier gives `{ reason: 'since' }`; `until: '2.5'` is available at 2.5 and gives `{ reason: 'until' }` at 3.1; an entry with neither mark is available everywhere; `isZosLevel` rejects `'9.9'`, `'abc'` and the number `3.1`
- [x] 1.2 Turn the lists in `keywords.js` into `Map` tables built with a `table()` helper, merge `PASSTHROUGH_OPS` into `STATEMENT_TYPES`, add `EMAIL` to JOB with `since: '2.3'` and mark NOTIFY `since: '2.3'`, each with a source comment; update `closestKeyword` and the parser to use the tables; verify `npm test` still passes with no new diagnostics

## 2. Level diagnostic in the validator

- [x] 2.1 Add `JCLK005` to the catalog, with messages for "available from" and "removed after", naming the keyword or statement, the statement type and both levels; verify a test checks both messages and that the severity is warning
- [x] 2.2 Make `validate(source, { zosLevel })` resolve the level, pass it to the parser and `checkKeywords`, report `JCLK005` for known-but-unavailable keywords and statements, and return `zosLevel`; verify `test/zos-levels.test.js`: no options gives `zosLevel: '3.2'`; item 10's JCL is clean at 2.3 and at the default; a test table with `since: '2.4'` gives `JCLK005` at 2.3 at the keyword's column and nothing at 2.4; `EMAILL=` gives `JCLK001` with "Did you mean 'EMAIL'?" and no `JCLK005`; an unknown level throws
- [x] 2.3 Remove the `todo` marker from `test/fixtures/nick/10-email-on-job.expected.json`; verify the fixture passes as a normal test

## 3. API

- [x] 3.1 Accept and check `zosLevel` in `POST /api/validate`, return 400 listing the supported levels for an unknown one, and record `api/level/<level>` for counted direct requests that were validated; verify `test/api.test.js`: no level gives `zosLevel: '3.2'` next to `diagnostics`, `ast` and `stats`; `'2.3'` is used; `'9.9'`, `'abc'` and `3.1` (number) give 400 with the levels listed and no `diagnostics`; a direct request at 2.5 records `api/level/2.5`; a rejected level records `api/result/bad-request` and no `api/level/` hit
- [x] 3.2 Document `zosLevel` (request and response) and `JCLK005` in Spec.md's API table; verify the text matches the implemented behaviour

## 4. Docs and progress

- [x] 4.1 Add to Features.md feature 41: only `EMAIL` (JOB) and the NOTIFY statement carry `since` marks so far, and other entries need levels from each release's "Summary of changes"; verify the item names feature 3
- [x] 4.2 Run lint, tests and the build in both packages; verify all pass
- [x] 4.3 Tick feature 3 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
