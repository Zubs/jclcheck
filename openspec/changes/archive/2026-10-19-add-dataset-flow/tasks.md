# Tasks

## 1. Backend

- [x] 1.1 Keep SET values in `job.sets`, add `JCLF001`–`JCLF005` to the catalog, and write `flowRules.js` (flow steps, names, actions, state, referbacks, IF downgrade, de-duplication); verify `test/dataset-flow.test.js`: no DSN, the sort/report example, create/read/delete, same-step referbacks, messages naming dataset and step, MOD, unknown symbol, conditional reader, PROC expansion and an uncalled PROC
- [x] 1.2 Return `datasets` from `validate`; verify the grid-row test and the severity list in `test/severities.test.js`

## 2. Frontend

- [x] 2.1 Add a DATASETS tab and grid to `ErrorPanel.vue`, pass `datasets` from `Workbench.vue`, go to a DD on cell click, count `datasets/open` and `datasets/cell-click`, add the `JCLF` group to `diagnosticCodes.js`, and remove the feature 36 marker; verify ErrorPanel and Workbench tests

## 3. Docs, checks and progress

- [x] 3.1 Describe the flow checks and `datasets` in the README and Spec.md
- [x] 3.2 Run lint, tests and the build in both packages; verify all pass
- [x] 3.3 Tick feature 36 in the Features.md Progress list; verify the box is ticked

## Workflow follow-up

- Archive the change and sync its specs.
