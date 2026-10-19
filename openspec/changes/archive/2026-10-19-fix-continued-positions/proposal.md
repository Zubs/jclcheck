# Proposal

## Why

The lexer joins continuation lines into one operand, and the tokenizer measures columns as offsets into that joined string, while rules report the statement's first line. So a mistake on line 5 of a statement is reported at line 3, at a column that doesn't exist there. Clicking it jumps to the wrong line, and the editor's underline (feature 25) marks the wrong text.

## What Changes

- The lexer records, for every statement, where each piece of the joined operand came from: its offset in the operand, its physical line and its starting column (operand continuations, quoted-string continuations and IF continuations).
- `tokenizeParams` maps offsets back through those pieces, so each parameter gets its own `line`/`col`, each value its own `valueLine`/`valueCol`, and parser errors (unmatched parentheses) their real line and column.
- Rules report parameter-level problems at the parameter's or value's own line; diagnostics about a whole statement (such as a missing data source) still point to its first line.
- An unclosed parenthesis is reported at the `(` that isn't closed, not past the end of the text. **Behaviour change:** `broken.jcl`'s `JCLP003` moves to the `(` of `DISP=(`.
- A test checks that every fixture diagnostic's column lies within its line.

## Capabilities

### New Capabilities

### Modified Capabilities
- `jcl-lexing`: positions on continued statements.

## Impact

- Backend: `lexer.js`, `paramTokenizer.js`, `parser.js`, `rules/paramRules.js`, `rules/ddRules.js`, `rules/procRules.js`; fixture `broken`.
