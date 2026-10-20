# Tasks

## 1. Qualified keywords

- [x] 1.1 Add `QUALIFIABLE_KEYWORDS`, `JCLK008`, `JCLK009` and `JCLR004`; in `checkStepsAndDDs`, check EXEC params with qualified keys as their base keyword (keywords and values) and apply the qualifier checks; verify `test/procstep-keywords.test.js`: unqualified EXECs unchanged (suite passes); item 2 has no `JCLK001`; 8-character step passes and 9 gets `JCLN001`; `REGON.S1=4M` gets "Did you mean 'REGION'?"; `PGM.S1=X` gets `JCLK008`; `REGION.S1=4X` gets `JCLS004`; in-stream S1 passes; S9 gets `JCLR004` listing S1, S2; `COND.S1=` on `PGM=` gets `JCLK009`; two-step override job is clean
- [x] 1.2 Remove the `todo` from `nick/02-continued-comment.expected.json`; verify it passes

## 2. Docs and progress

- [x] 2.1 Add `JCLK008`, `JCLK009` and `JCLR004` to feature 30's code list in Features.md; verify the text
- [x] 2.2 Run lint, tests and the build in both packages; verify all pass
- [x] 2.3 Tick feature 18 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
