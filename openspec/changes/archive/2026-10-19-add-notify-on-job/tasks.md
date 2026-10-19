# Tasks

## 1. NOTIFY= rule

- [x] 1.1 Let any rule carry its own `describe`, let keyword entries set `checkSymbols`, and add the NOTIFY rule to `JOB_KEYWORDS`; verify `test/notify.test.js`: no NOTIFY is clean; `&SYSUID` and `IBMUSER` pass; 8 characters pass and 9 fail naming the rule; `IBMUSERRRRRRRR` and `laskdjasd1.&SYSUID` fail at column 19; `N1.IBMUSER` passes; `1BMUSER` and empty fail; a lower-case ID passes
- [x] 1.2 Remove the `todo` from `nick/07a` and `nick/07b`; verify they pass, and `nick/07c` still passes
- [x] 1.3 Record in Features.md feature 41 that `node.userid` is accepted for now and item 7c pins that; verify the text

## 2. Checks and progress

- [x] 2.1 Run lint, tests and the build in both packages; verify all pass
- [x] 2.2 Tick feature 16 in the Features.md Progress list; verify the box is ticked and the **Done when** holds as far as feature 41 allows

## Workflow follow-up

- Archive the change and sync its specs.
