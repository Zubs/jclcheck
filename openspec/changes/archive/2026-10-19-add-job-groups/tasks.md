# Tasks

## 1. Parsing job groups

- [x] 1.1 Add the group statements, `SCHEDULE` and their keyword tables; build group nodes in the parser with `JCLG001`–`JCLG007` and `JCLG010`, skip `JCLO001` when a group exists, and return `jobGroups`; verify `test/job-groups.test.js`: a stream without groups is unchanged (suite passes); one GJOB is clean; 8/9-character names; mismatched and missing ENDGROUP; ENDGROUP alone; a closed JOBSET with SJOBs is clean; SJOB outside a set; AFTER before any GJOB

## 2. Group rules

- [x] 2.1 Add `rules/groupRules.js` with keyword checks, `JCLG008` (listing jobs), WHEN conditions and `JCLG009` cycles; verify: item 5 is clean; `AFTER NAME=Z` gets `JCLG008` listing A, B; a three-job cycle gets one `JCLG009` naming A, B and C; a group plus a job with `SCHEDULE JOBGROUP=MULTI` is clean; `WHEN=(RC=>0)` gets `JCLC001`
- [x] 2.2 Remove the `todo` from `nick/05-jobgroup.expected.json`; verify it passes

## 3. Docs and progress

- [x] 3.1 Add `JCLG` to the Help dialog and README code list, and a feature 41 question on the job group keyword tables; verify frontend tests and lint pass
- [x] 3.2 Run lint, tests and the build in both packages; verify all pass
- [x] 3.3 Tick feature 22 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
