# Design

## Context

`lexer.js` splits each physical line with `splitFields(rawLine)` and joins continuations while the operand ends with a comma, an open parenthesis or an open quote. It never looks at column 72, and null statements and the in-stream delimiter are compared against the whole trimmed line.

## Goals / Non-Goals

**Goals:** read columns as z/OS does; continued comments; a clear diagnostic when a marked column 72 isn't followed by a continuation.

**Non-Goals:** quoted strings continued across lines (feature 5); `DLM=` and other delimiter rules (feature 6); exact positions on continued statements (feature 33).

## Decisions

1. **Truncate once per line.** Two helpers: `statementText(line)` returns `line.slice(0, 71)` and `continuationMark(line)` is true when column 72 exists and isn't blank. Field splitting, continuation joining, the null-statement test and the delimiter test all use `statementText`. Columns don't shift, so every existing column stays right. Data lines keep `rawLine`.

2. **Comment continuation after the operand loop.** Once the operand is complete (the operand loop ended without a `JCLP004`/`JCLL003`), if the last consumed line is marked, the lexer consumes following lines while they start with `//` and have a blank column 3, appending their trimmed text to `comment`, and stops when a consumed line isn't marked. If a marked line is followed by anything else, it reports `JCLL004` and leaves that line unconsumed. A marked column 72 on a line whose operand ends with a comma changes nothing, since the operand continuation already consumes the next line.

3. **`JCLL004` wording covers the common beginner cause.** The usual way to hit it by accident is an operand running past column 71. The message says column 72 is marked so the next line should continue the statement, and the suggestion says text after column 71 isn't read and to continue a long statement on a new line. Severity: error, the lexer default, since z/OS fails the job.

4. **Fixtures.** `broken.jcl` line 9 has operand text in columns 72–89, so it now gets `JCLL004` at column 72; its other diagnostics keep their positions. This is the intended z/OS behaviour, recorded in the proposal. Nick's item 2 still gets `JCLK001` for `COND.PAID`, `COND.LATE` and `COND.BILL` until feature 18, so its `todo` moves to feature 18.

## Risks / Trade-offs

- [Someone pastes JCL with long lines that z/OS would also reject] → They now see `JCLL002` and `JCLL004` instead of silently accepted text, which matches the real system.
