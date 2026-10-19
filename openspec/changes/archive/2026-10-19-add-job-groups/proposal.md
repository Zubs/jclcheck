# Proposal

## Why

JES2 job groups (`JOBGROUP` … `ENDGROUP`) describe a set of jobs and the order they run in. None of their statements is recognised, so Nick's item 5 example gets 11 errors.

## What Changes

- New statements: `JOBGROUP`, `ENDGROUP`, `GJOB`, `JOBSET`, `SJOB`, `ENDSET`, `AFTER`, `BEFORE`, `CONCURRENT`, and `SCHEDULE` (whose `JOBGROUP=` lets a real job join a group), each with a keyword table.
- A job group node (`ast.jobGroups`) holds its jobs, sets and dependencies. Checks, in a new `JCLG` group (errors):
  - `JCLG001` ENDGROUP name differs from its JOBGROUP; `JCLG002` JOBGROUP without ENDGROUP; `JCLG003` ENDGROUP without JOBGROUP.
  - `JCLG004` duplicate job name in a group; `JCLG005` JOBSET without ENDSET; `JCLG006` SJOB outside a JOBSET.
  - `JCLG007` AFTER/BEFORE/CONCURRENT before any GJOB/SJOB; `JCLG008` NAME= not a job in the group (lists the group's jobs).
  - `JCLG009` dependency cycle, reported once and naming the loop; `JCLG010` a group statement outside any JOBGROUP.
- Job names must be valid names (`JCLN001`); `WHEN=` conditions are checked with the condition parser.
- A stream holding only a job group no longer gets `JCLO001`.
- Nick's item 5 fixture loses its `todo`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `job-structure`: adds job groups.

## Impact

- Backend: `keywords.js`, `parser.js`, new `rules/groupRules.js`, `errors.js`, `validator.js`.
- Frontend: Help dialog lists `JCLG`.
