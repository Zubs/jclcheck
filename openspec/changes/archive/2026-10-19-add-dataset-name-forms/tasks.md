# Tasks

## 1. Dataset name forms

- [x] 1.1 Add `JCLS010` and `JCLS014`, and rework `checkDsn` for members, generations, temporary names and quoted names; verify `test/dsn-forms.test.js`: item 13 is clean; `A.B(MEM)`, `A.B(+1)`, `A.B(0)`, `&&TEMP`, `&&TEMP(MEM)` are clean; 8-character member passes and 9 gets `JCLS010` naming it; 44 characters plus a member pass; `A.B()` and `A.B(1MEM)` get `JCLS010`; `&&` gets `JCLS006`; `'ODD.NAME'` gets only a `JCLS014` info; a plain DSN is unchanged (suite passes)
- [x] 1.2 Remove the `todo` from `nick/13-member-name.expected.json`; verify it passes

## 2. Docs and progress

- [x] 2.1 Record `JCLS014` in Features.md feature 19 and feature 30's code list; verify the text
- [x] 2.2 Run lint, tests and the build in both packages; verify all pass
- [x] 2.3 Tick feature 19 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
