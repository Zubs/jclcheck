# Proposal

## Why

Most real jobs call catalogued procedures and pull in INCLUDE members that the checker can't see, so it can only warn (`JCLR001`) and never checks what's inside them. Letting the user paste those members in turns a blind spot into a real check.

## What Changes

- `POST /api/validate` accepts an optional `library`: up to 50 entries of `{ dsn, member, source }` (`dsn` may be left out for the system procedure library). An invalid entry, or more than 50, gets a 400 naming the entry.
- PROC calls that aren't in-stream are looked up in the job's JCLLIB `ORDER=` libraries in order, then in entries without a library. A found procedure is parsed (PROC and PEND optional) and checked like an in-stream one: symbolic parameters, DD overrides, step-qualified keywords.
- `INCLUDE MEMBER=name` is replaced by the member's statements before parsing, using the same search order. Includes can nest up to 15 levels (feature 41 asks to confirm); a loop is reported once; JOB, PROC, PEND and JCLLIB inside an INCLUDE group are reported.
- Diagnostics inside a member carry `member` (`CAMPBEL.PROCS.JCL(MYPROC2)`, or just the member name) and the line within the member.
- New codes: `JCLR005` INCLUDE member not found (warning); `JCLR006` INCLUDE loop; `JCLR007` INCLUDE nested too deep; `JCLR008` statement not allowed in an INCLUDE group. `JCLR001` and `JCLR005` say the member can be added in the Library panel.
- Workbench: a **Library** panel (toggled from the header) listing members, each with library, member name and an `Editor` for its text, plus add and remove. Its contents are sent with each check. Diagnostics inside a member show as `MYPROC2 L3:5`; clicking one opens the panel at that member and line. Adding and removing count as `library/add` and `library/remove`.

## Capabilities

### New Capabilities
- `procedure-library`: resolving catalogued procedures and INCLUDE members from a user-supplied library.
- `workbench-library`: the workbench Library panel.

### Modified Capabilities

## Impact

- Backend: new `library.js`; `validator.js`, `rules/procRules.js`, `errors.js`, `index.js`.
- Frontend: new `components/LibraryPanel.vue`; `pages/Workbench.vue`, `components/ErrorPanel.vue`, `api.js`, Help dialog.
- API: new optional request field `library`; diagnostics may carry `member`.
