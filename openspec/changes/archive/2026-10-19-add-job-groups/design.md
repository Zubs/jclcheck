# Design

## Context

Since feature 10 the parser tracks a list of jobs, `job` (current) and `ended`. Unknown operations get `JCLP002`. `JCLO001` fires when there are statements but no JOB.

## Decisions

1. **Statement tables.** `STATEMENT_TYPES` gains the group statements and `SCHEDULE`. `GROUP_KEYWORDS` maps each to its keyword table (JOBGROUP: ACCT, PGMR, OWNER, GROUP, PASSWORD, SECLABEL, HOLD, ERROR, ONERROR, SYSAFF, SYSTEM, SCHENV; GJOB/SJOB/JOBSET: FLUSHTYP, ONERROR; AFTER/BEFORE: NAME, WHEN, ACTION, OTHERWISE; CONCURRENT: NAME; SCHEDULE: JOBGROUP, AFTER, BEFORE, DELAY, HOLDUNTL, STARTBY, WITH). The lists come from the JES2 job group statements as remembered; feature 41 gets a question to confirm them.
2. **Parser state.** `group` (current group or null) and `set` (current job set). JOBGROUP closes any current job and opens a group; GJOB/SJOB add `{ name, line, deps: [] }`; AFTER/BEFORE/CONCURRENT attach `{ kind, params, line }` to the last job; ENDSET/ENDGROUP close. SCHEDULE is kept on the current job (`job.schedule`) without further checks. Structural codes are reported in the parser.
3. **`rules/groupRules.js`** runs after parsing: keyword checks for every group statement, NAME= resolution (`JCLG008`), WHEN conditions (`parseCondition`, no THEN), and cycles. The graph has an edge X→J for "J AFTER X" and J→X for "J BEFORE X"; a DFS finds the first cycle, reported once on the JOBGROUP line.
4. **`JCLO001`.** Not reported when the stream has a job group.

## Risks / Trade-offs

- [Keyword tables from memory may miss real keywords] → They give `JCLK001` warnings, not errors; feature 41 asks to confirm.
