# Proposal

## Why

The JCL Reference lets a quoted value run to column 71 and continue in column 16 of the next line. The lexer scans each continuation line for quotes on its own, so the closing quote on the second line is read as an opening one. Nick's item 3 gets a false `JCLL003` and `JCLP003`.

## What Changes

- A line that ends inside an open quote is treated as running through column 71 (shorter lines are padded with blanks, as on an 80-column record), and the next line's text from column 16 is joined directly to the string.
- The continuation line's quote state carries over, so quote and parenthesis tracking runs over the whole joined operand.
- New error `JCLL005` when a continued quoted string resumes in a column other than 16, pointing at the column found. (Features.md called this `JCLL004`, but feature 4 already uses that code.)
- A doubled quote split across the break (`'` in column 71, `'` in column 16) is read as one literal quote.
- An unterminated string gets `JCLL003` only; it no longer also gets `JCLP003`.
- Nick's item 3 fixture loses its `todo`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `jcl-lexing`: adds continued quoted strings.

## Impact

- `backend/src/lexer.js`, `backend/src/paramTokenizer.js`, `backend/src/errors.js`.
- Features.md feature 5 (code renamed to `JCLL005`) and feature 41 (split doubled-quote question).
