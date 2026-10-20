# Design

## Context

`tokenizeParams` drops empty parts. `checkKeywords` reports `JCLK003` for a positional after a keyword. The parser and `checkExecRequired` treat the first positional on EXEC as a PROC name; `ddRules` looks at DD positionals by value.

## Decisions

1. **Empty positionals only before the first keyword.** The tokenizer keeps an empty part as `{ kind: 'positional', value: '', empty: true, col }` while no keyword has been seen; empty parts after a keyword are still dropped, so `A=1,,B=2` doesn't suddenly get `JCLK003`. Code that picks "the positional" (EXEC PROC name, `checkExecRequired`) skips empty entries.
2. **Limits as data.** `POSITIONAL_LIMITS = { JOB: 2, EXEC: 1, DD: 1 }` in `keywords.js`. `checkPositionalLimit(params, stmt, line)` counts positionals before the first keyword and reports `JCLK004` (severity error, overriding the `JCLK` warning default, since z/OS fails the job) at the first one over the limit.
3. **JOB sizes and quoting** in `paramRules` for the first two JOB positionals: accounting length (without outer parentheses) > 143, name length (unquoted, `''` → `'`) > 20 → `JCLS012`; unquoted name matching anything outside `[A-Za-z0-9$#@.-]` → `JCLS013`. New codes, since `JCLS009`–`JCLS011` are taken or reserved.
4. **Fixture column.** The first extra positional is the clearest place to point; for Nick's example that's column 15.
