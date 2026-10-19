# Tasks

## 1. Backend

- [x] 1.1 Give every `CATALOG` entry a `severity`, make `JCLK002`, `JCLK003`, `JCLS001` and `JCLS006`–`JCLS008` errors, fall back to the prefix, and move hand-set call-site severities into the catalog; verify `test/severities.test.js` lists every code's severity and covers the example, one of each code, 44/45-character names and `DISP=&D`
- [x] 1.2 Update fixture and sample expectations whose severities changed; verify `npm test` passes

## 2. Frontend

- [x] 2.1 Show each code's default severity in Help from `diagnosticCodes.js`; verify the Help test checks it against the catalog and the workbench shows "1 ERROR" for the example

## 3. Checks and progress

- [x] 3.1 Run lint, tests and the build in both packages; verify all pass
- [x] 3.2 Tick feature 34 in the Features.md Progress list; verify the box is ticked

## Workflow follow-up

- Archive the change and sync its specs.
