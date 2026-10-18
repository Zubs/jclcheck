# Design

## Context

The lexer emits `STMT`, `COMMENT` and `NULL` entries and reports `JCLL001` for any non-blank line that doesn't start with `//`. The parser ignores everything but `STMT`. In-stream data is handled before any of this, so data lines never reach the JES2 test.

## Decisions

1. **Lexer entry.** Before the `JCLL001` branch, a line matching `/^\/\*([A-Za-z$])/` becomes `{ type: 'JES2', name, operand, line, nameCol: 3, operandCol, raw }`. `name` is the word after `/*` (upper-cased; `$` for commands, whose text is kept whole). Only columns 1–71 are read, as for JCL.

2. **Rules in `rules/jesRules.js`.** `checkJesStatements(statements, diagnostics)` walks the lexer's list in order, tracking whether the first JOB `STMT` has been seen, and applies: known name (`JCLJ001`, using `closestKeyword` against `JES2_STATEMENTS`), ROUTE operand (`JCLJ002`), placement (`JCLJ003`). The validator calls it with the lexer's statements. Feature 9 adds JES3 to the same file.

3. **Severity.** `makeDiagnostic` defaults `JCLJ` codes to warning, like `JCLK` and `JCLS`.

4. **Placement table.** Kept as data next to the statement table: `before: true` for `PRIORITY`, `anywhere: true` for `SIGNON`, `SIGNOFF`; the rest default to after JOB. This follows the JES2 initialization and tuning / JCL reference descriptions of where each statement goes.

## Risks / Trade-offs

- [Shops with local JES2 statements see `JCLJ001`] → It's a warning, and feature 37's site profile can add names later.
