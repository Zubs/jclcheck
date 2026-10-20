# Design

## Steps followed

For each job, the steps are expanded in order into "flow steps". A step that calls a resolved PROC becomes one flow step per PROC step, labelled `STEP.PROCSTEP`; a DD override named `PROCSTEP.DD` on the calling step replaces that DD's keywords, key by key. Every other step is one flow step. PROCs nobody calls are followed on their own, with their defaults. Diagnostics are de-duplicated by code, line and column, since an in-stream PROC called twice would otherwise report the same line twice.

## Names

`DSN`/`DSNAME` is uppercased. `&SYM` and `&SYM.` are replaced with known values: the PROC's defaults, then SET values written earlier in the job, then the calling EXEC's keywords (quotes removed). A name that still contains a single `&` is skipped. A member in brackets is dropped; a relative generation (`(+1)`, `(0)`, `(-1)`) is skipped. A name starting `&&` is temporary. A referback (`*.…`) is resolved to its target DD's name when the target exists.

## Actions

From `DISP=(status,normal,abnormal)`: status `NEW` → N, `OLD`/`SHR` → R, `MOD` → M (status defaults to NEW). Normal `PASS` → P, `DELETE` → D; a `NEW` dataset with no normal disposition is deleted at the end of its step, which counts for `JCLF004` but isn't shown in the grid.

## State per dataset

Walking flow steps in order, per name: who created or passed it, an unread pass (step, position), the step that catalogued it, and the step that deleted it.
- R: temporary and never created or passed → JCLF001, naming the closest earlier temporary name as a likely typo; deleted and not re-created → JCLF004. Clears the unread pass.
- M: creates if needed; clears a delete and the unread pass.
- N: `CATLG` while already catalogued with no delete since → JCLF003. Clears a delete.
- P sets the unread pass; D (or the implicit delete) records the delete and clears the catalogue.
At the end, each unread pass is a JCLF002.

A JCLF001 in a step inside an IF/THEN/ELSE (the job's, or the PROC's) is a warning, since the step may not run.

## Referbacks

`*.DD` is an earlier DD in the same flow step. `*.S.DD` is an earlier job step `S` (or, inside a PROC, an earlier step of the same PROC call) with DD `DD`. `*.S.PS.DD` is an earlier job step `S` that calls a PROC with step `PS` and DD `DD`. Anything else is JCLF005. Checked on `DSN`/`DSNAME` and `VOL`/`VOLUME` `REF=`.

## Response and grid

`datasets` has an entry `{ job, steps, datasets }` for each job that names a dataset: `steps` are the job's flow-step labels (the grid's columns), and each dataset is `{ name, temporary, touches: [{ step, dd, line, column, actions }] }`, in first-touch order, with `member` on touches in library members. The grid has one row per dataset and one column per flow step of that job; a cell shows its actions joined (`NP`, `RD`). Clicking a cell selects that DD like a diagnostic.
