# Design

## Context

`validator.validate` lexes, parses into jobs, resolves in-stream PROCs per job (`procRules.resolveProcCalls`) and runs rules. Every diagnostic is built from a statement's `line`.

## Decisions

1. **Reserved line ranges for members.** Each library member that gets read is given a base of `(n + 1) * 1,000,000`; its statements' `line`/`endLine` are shifted by that base when lexed. Parser and rules need no changes. At the end, `library.js` maps any diagnostic with `line >= 1,000,000` back to `{ member, line }`. A real job can't reach a million lines within the 2 MB limit.
2. **Search order** (`library.js`): `findMember(name, order)` tries each JCLLIB library in order (case-insensitive DSN match), then entries without a DSN. For PROC calls the order is `job.jcllib`'s; for INCLUDE it is the last JCLLIB seen before the INCLUDE in the stream (the expansion runs before parsing).
3. **INCLUDE expansion** before parsing: a recursive pass replaces each `INCLUDE MEMBER=x` statement with the member's lexed (and shifted) statements, tracking the chain for loops (`JCLR006`, once per member) and depth (`JCLR007` past 15). JOB, PROC, PEND and JCLLIB statements in a member get `JCLR008` and are dropped. Not found → `JCLR005`, and the INCLUDE stays (the parser ignores it).
4. **Catalogued procedures.** `resolveProcCalls` takes a `lookup(name, job)` callback. The validator's lookup lexes the member once (cached), adds a synthetic `PROC` statement if it doesn't start with one and a synthetic `PEND` if it doesn't end with one, parses it, and returns the PROC node, which is then checked with the in-stream PROC bodies.
5. **API validation** in `index.js`: `library` must be an array of ≤ 50 objects with a string `source`, a member matching the member-name rule and an optional DSN that passes the dataset name rules; the 400 message names the entry ("library entry 3 (MYPROC2)").
6. **Frontend.** `LibraryPanel.vue` holds the list (each entry: DSN input, member input, an `Editor` with only that member's diagnostics). `Workbench.vue` keeps `library` (array of `{ id, dsn, member, source }`), shows the panel in the editor pane when toggled from a header button, re-checks (debounced) when it changes, and sends `{ dsn, member, source }` through `validateJcl(source, { library })`. Main-editor gutter markers use only diagnostics without `member`. `ErrorPanel` shows the member name before the location. Clicking a member diagnostic opens the panel and calls the member editor's `scrollToLine`.

## Risks / Trade-offs

- [Large libraries slow checks] → 50 members within 2 MB, each lexed at most once per check.
