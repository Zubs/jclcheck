# Tasks

## 1. MSGLEVEL

- [x] 1.1 Describe integer ranges of up to three values by listing them, and add the MSGLEVEL `list` rule to `JOB_KEYWORDS`; verify `test/msglevel.test.js`: no MSGLEVEL is clean; the six valid forms are clean; `(3,1)` and `(2,2)` get `JCLS009` with "messages must be 0 or 1; found '2'" for the second; `(1,1,1)` fails; `()`, `(A,B)` and `(1,1` get diagnostics without crashing; item 6 gets one `JCLS009` naming statements and messages, and `(1,1)` is clean
- [x] 1.2 Remove the `todo` from `nick/06-msglevel.expected.json`; verify it passes

## 2. Checks and progress

- [x] 2.1 Run lint, tests and the build in both packages; verify all pass
- [x] 2.2 Tick feature 15 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
