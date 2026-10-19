# Design

## Context

The lexer splits the operand at the first blank outside brackets, so for `// IF RC = 0 THEN` the "operand" is `RC` and the rest is treated as a comment. The parser pushes an `IfNode` on IF and pops it on ENDIF, but the node is never attached to the AST.

## Decisions

1. **Condition text from the raw lines.** The parser rebuilds the condition from `stmt.raw`: the first line from the operand column, later lines from their first text column, all within columns 1–71, as a list of `{ ch, line, col }`, so every token knows its real line and column. Parsing stops at `THEN`; anything after it is comment.
2. **IF continuation in the lexer.** After the usual continuation rules, an IF whose text so far has no `THEN` word consumes following `//` lines with a blank column 3 (not comments) until one contains `THEN` or a non-continuation line appears.
3. **`conditions.js`.** A tokenizer (brackets; operator runs of `<>=¬` validated against the known set; `&`, `|`; words) and a small recursive-descent parser (`expr := unary ((AND|OR) unary)*`, `unary := NOT unary | primary`, `primary := '(' expr ')' | test`). AND and OR aren't ranked, since nothing is evaluated. It returns `{ refs, errors }`: step references `{ step, procstep, line, col }` and errors already shaped as `{ code, data, line, col }`.
4. **Branches and nesting in the parser.** `IfNode` gets `sawElse`; ELSE marks the innermost IF (`JCLC007` if already marked). On EXEC, the step's `{ name, line }` is added to the current branch of every open IF. IFs are pushed onto `container.ifs`; at push, nesting beyond 15 gets `JCLC008`. Each IF records `earlierSteps` (names of the container's steps so far) for the reference check.
5. **References after PROC resolution.** `rules/ifRules.js` runs after `resolveProcCalls`: a ref whose step isn't in `earlierSteps` gets `JCLC004`; a ref with a procstep whose step has a `resolvedProc` lacking that step gets `JCLC005`.
6. **Codes.** `JCLC001`–`JCLC008`, all errors.

## Risks / Trade-offs

- [Columns on continued IF lines] → Each token keeps its own line and column, so they're right.
- [`¬` typed as `^` or `!` on PC keyboards] → Not accepted; the error names the character, and feature 41 can decide on aliases.
