# Proposal

## Why

The lexer reads every character of a line as part of the statement. z/OS reads only columns 1–71: column 72 marks a continued comment and columns 73–80 hold sequence numbers. So Nick's item 2 example from the JCL Reference, a comment continued with an `X` in column 72, is read as two bogus statements (`JCLP002` for operations `THE` and `FOR`), and card-image JCL with sequence numbers gets false errors.

## What Changes

- The lexer reads statement fields from columns 1–71 only. Columns 73–80 are ignored for JCL statements, comment statements, null statements and the in-stream data delimiter.
- A non-blank column 72 after a complete operand continues the comment: following `//` lines with a blank column 3 are added to the statement's comment and never parsed, for as long as column 72 stays marked.
- New error `JCLL004` when column 72 is marked but the next line doesn't continue the statement (a new statement, a non-JCL line, or the end of the file).
- In-stream data lines are still passed through whole, since their columns 73–80 are data.
- `JCLL002` (line over 80 characters) is unchanged.
- The lexer's header comment and the Help dialog describe the column rules.
- Nick's item 2 fixture no longer gets `JCLP002`. It stays `todo`, now for feature 18, because the `COND.PAID=` keywords are still unknown.
- **Behaviour change:** `broken.jcl` line 9 runs to column 89, so its column 72 now counts as a continuation mark and the fixture gains a `JCLL004`.

## Capabilities

### New Capabilities
- `jcl-lexing`: how raw JCL text is read into statements — record columns, continuation, comments and in-stream data.

### Modified Capabilities

## Impact

- `backend/src/lexer.js`, `backend/src/errors.js`, `frontend/src/components/HelpModal.vue`.
- Fixtures: `nick/02-continued-comment` (todo moves to feature 18) and `broken` (gains `JCLL004`).
