# Tasks

## 1. Positions

- [x] 1.1 Record operand pieces in the lexer and map offsets in `tokenizeParams` (parameter `line`/`col`, value `valueLine`/`valueCol`, errors' line/column), and report an unclosed `(` at its own position; verify unit tests in `test/positions.test.js` for the piece map and the paren position
- [x] 1.2 Use parameter and value lines in the rules (`paramRules`, `ddRules`, `procRules`) and the parser's error lines; verify: a one-line statement is unchanged; the SPACE example is at 5:18; three problems on three lines; columns 4 and 16; a continued quoted value; an unmatched `(` on line 2 of 3; every fixture diagnostic's column is within its line
- [x] 1.3 Update `broken.expected.json` for the moved `JCLP003`; verify `npm test` passes

## 2. Checks and progress

- [x] 2.1 Run lint, tests and the build in both packages; verify all pass
- [x] 2.2 Tick feature 33 in the Features.md Progress list; verify the box is ticked

## Workflow follow-up

- Archive the change and sync its specs.
