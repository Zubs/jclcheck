# Tasks

## 1. JCLLIB

- [x] 1.1 Add `JCLO005`, `JCLO006`, `JCLO008`; store JCLLIB on its job in the parser and report placement; verify `test/jcllib.test.js`: no JCLLIB is clean; directly after JOB is clean; item 17 gets `JCLO005` at 4:12 and `JCLR001`; directly after the first EXEC gets `JCLO005` with a fix naming where to move it; the moved version is clean of `JCLO005`; two JCLLIBs give `JCLO006` on the second; one inside a PROC gets `JCLO008`
- [x] 1.2 Check JCLLIB keywords, required `ORDER=` and library names in `paramRules`; verify a missing `ORDER` gives `JCLK002` naming it, and a 45-character library gives `JCLS006`
- [x] 1.3 Name the JCLLIB libraries in `JCLR001`; verify the message reads "…A.PROCS or 2 other libraries" and stays a warning
- [x] 1.4 Remove the `todo` from `nick/17-jcllib-placement.expected.json`; verify it passes

## 2. Docs and progress

- [x] 2.1 Record `JCLO008` in Features.md feature 11 and feature 30's code list; verify the text
- [x] 2.2 Run lint, tests and the build in both packages; verify all pass
- [x] 2.3 Tick feature 11 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
