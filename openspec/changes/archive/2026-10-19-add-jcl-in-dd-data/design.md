# Design

## Context

Feature 6 made `DD DATA` end only at `/*` or its `DLM=`, so Nick's item 14 no longer gets `JCLO004`. `ddRules.checkDDStatements` walks each step's DDs; DD nodes keep `instreamData` (raw lines).

## Decisions

1. **Which DDs:** any DD whose in-stream data contains a JOB statement. Only `DD DATA`, or `DD *` with `DLM=`, can hold `//` lines, so this covers both without looking at how the data was introduced.
2. **JOB line test:** `/^\/\/\S*\s+JOB(\s|$)/i` on each data line.
3. **INTRDR test:** any DD in the step with a `SYSOUT` keyword whose second sub-value is `INTRDR` (case-insensitive).
4. **Code and severity:** `JCLD004`, severity `info` (override), column 1 on the DD line.
5. **Fixture change:** `nick/14a` expects `JCLD004` info at line 3, column 1. The "Done when" allows non-error diagnostics.

## Risks / Trade-offs

- [A job written to a dataset rather than INTRDR gets no note] → Intended: only the internal reader submits it.
