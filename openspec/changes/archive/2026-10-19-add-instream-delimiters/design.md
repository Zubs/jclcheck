# Design

## Context

`lexer.js` starts in-stream data for a DD whose operand starts with `*` or contains `DATA`, matching `DLM=` only as two letters or digits. While in data, a line equal to the delimiter or any non-comment `//` line ends it. There is a leftover placeholder assignment for `instreamDelim`.

## Decisions

1. **`parseDelimiter(value)`** in `lexer.js` (exported for `ddRules`) returns the two-character delimiter or `null`. Unquoted: `/^[A-Za-z0-9$#@]{2}$/`. Quoted: strip the quotes, turn `''` into `'`, require length 2. The lexer finds the raw value with `/(?:^|,)DLM=('(?:[^']|'')*'|[^,\s]*)/i` on the joined operand.

2. **End-of-data test per mode.** On entering data the lexer records `{ delim, kind: 'star' | 'data' }`. `delim` set → end when the raw line starts with it. Otherwise end at `/^\/\*( |$)/` on `statementText(line)` (so sequence numbers still don't matter), and for `star` also at a non-comment `//` line, re-read as JCL, as today.

3. **Codes.** `JCLS009`, `JCLS010`, `JCLK004` and `JCLO005`–`JCLO007` are reserved by later features in Features.md, so this feature uses `JCLS011`, `JCLL006` and `JCLK006`. `JCLL006` is a warning (override), because z/OS ends the job stream there and the job may still run.

4. **Where each diagnostic comes from.** `JCLL006` from the lexer at end of input, on the DD line, column 1. `JCLS011` and `JCLK006` from `ddRules`, which sees the DD's params and `instreamData`.

5. **Missing delimiter only when one is required.** `DD *` without `DLM=` may end at the end of the input, as it does at the next statement, so it gets no warning; this keeps existing fixtures unchanged.

## Risks / Trade-offs

- [`DD DATA` now swallows `//` lines until `/*`, so a forgotten `/*` hides the rest of the job] → `JCLL006` names the missing delimiter at the end.
