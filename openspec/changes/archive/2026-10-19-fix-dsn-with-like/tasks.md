# Tasks

## 1. LIKE

- [x] 1.1 Stop counting LIKE as a source in `ddRules.js` (temporary dataset without DSN; `JCLD003` with SYSOUT, `*` or `DATA`) and check its value as a dataset name without member or generation; verify `test/like.test.js`: the example is clean; five orders of DSN/LIKE/DISP/UNIT/SPACE are clean; `LIKE=A.B,SYSOUT=*` gets `JCLD003` naming both; `LIKE=` gets `JCLS006`; a DD with nothing still gets `JCLD002`; `LIKE=A.B(MEM)` gets `JCLS006`
- [x] 1.2 Note in Features.md feature 41 (LIKE question) what is done for now; verify the text

## 2. Checks and progress

- [x] 2.1 Run lint, tests and the build in both packages; verify all pass
- [x] 2.2 Tick feature 31 in the Features.md Progress list; verify the box is ticked

## Workflow follow-up

- Archive the change and sync its specs.
