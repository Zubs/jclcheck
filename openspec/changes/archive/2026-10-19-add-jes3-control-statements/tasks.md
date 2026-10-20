# Tasks

## 1. JES choice

- [x] 1.1 Add `JES_TYPES`/`jesAvailable` to `levels.js` and `JES3_STATEMENTS` (with `until`, `place`, keyword tables) to `keywords.js`; make `validate` accept and return `jes`, throwing for an unknown JES or JES3 after 2.5; verify tests: default `jes` is JES2; JES3 at 2.5 works; JES3 at 3.1 throws
- [x] 1.2 Check `jes` in `POST /api/validate` (400 with reason for JES3 at 3.1+/3.2 default and for `JES4`), return it, and record `api/jes/<jes>` for validated direct requests; verify `test/api.test.js` cases, and update the existing direct-use expectations that list every hit
- [x] 1.3 Document `jes` in Spec.md's API row; verify it matches

## 2. JES3 statements

- [x] 2.1 Pass `jes` to the lexer and emit `JES3` entries, `//**` commands, and `//*DATASET` data until `//*ENDDATASET` (marking unclosed); verify `test/jes3.test.js`: `//*MAIN CLASS=A` is a JES3 entry; `//*MAINFRAME NOTES` and `//* MAIN` stay comments; DATASET data lines get no `JCLL001`
- [x] 2.2 Add `JCLJ301`–`JCLJ306` and the JES3 checks in `jesRules.js`; verify tests: valid MAIN/FORMAT/NETACCT job is clean; `//*MIAN CLASS=A` gets `JCLJ301` with "Did you mean 'MAIN'?"; `//*MAIN CLAS=A` gets `JCLJ302` with "Did you mean 'CLASS'?"; unclosed DATASET gets `JCLJ304`; MAIN after the first EXEC gets `JCLJ303`; `/*ROUTE` under JES3 gets `JCLJ305`; `//*MAIN` under JES2 gets one `JCLJ306` info and nothing else; a JES3 production job at 2.4 is clean

## 3. Docs and progress

- [x] 3.1 Add JES3 to the Help dialog, add a JES3-values note to Features.md feature 14, and extend the feature 41 JES3 question to the keyword tables; verify the text
- [x] 3.2 Run lint, tests and the build in both packages; verify all pass
- [x] 3.3 Tick feature 9 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
