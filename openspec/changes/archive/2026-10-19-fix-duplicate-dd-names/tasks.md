# Tasks

## 1. Duplicate DD warning

- [x] 1.1 Report `JCLD001` as a warning with the new wording; verify `test/duplicate-dd.test.js`: no DDs, no warning; item 18 gives one warning on line 4 and is valid with 0 errors and 1 warning; three DDs give two; different steps give none; `sysut2`/`SYSUT2` give one
- [x] 1.2 Update the `broken` fixture and the broken sample's expected result to the warning, and remove the `todo` from `nick/18-duplicate-dd`; verify `npm test` passes

## 2. Docs and progress

- [x] 2.1 Note in Features.md feature 41 that the message doesn't name which DD is used until it's confirmed; verify the text
- [x] 2.2 Run lint, tests and the build in both packages; verify all pass
- [x] 2.3 Tick feature 20 in the Features.md Progress list; verify the box is ticked and the **Done when** holds as far as feature 41 allows

## Workflow follow-up

- Archive the change and sync its specs.
