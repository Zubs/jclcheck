# Proposal

## Why

Pasted or hand-typed JCL often has ragged columns and lines that run past column 71. Today the tool can only report a long line.

## What Changes

- `format(source)` in `backend/src/formatter.js`: name in column 3, operation in column 12, operand one blank after, continued operands in column 16, operands broken after a comma so nothing passes column 71, long quoted strings continued in column 16 as z/OS allows. Names, operations and keyword names are uppercased; values are left as written.
- Comments, in-stream data, JES2/JES3 statements, IF/ELSE/ENDIF and statements with sequence numbers are left as written; a statement with an unmatched parenthesis, or whose comment wouldn't fit, is left as it is with a note.
- A line whose operand runs past column 71 is read in full and broken after a comma.
- The result is compared with the input (statements, parameters and diagnostics apart from line length) and refused, with a reason, if it differs.
- `POST /api/format` returns `{ text, changed, notes, refused }`; `jclcheck format [--write]` in the CLI.
- Workbench: F4 FORMAT (Alt+R) with a before-and-after preview marking changed lines, APPLY with Undo, CANCEL or Escape.

## Capabilities

### New Capabilities
- `formatter`: formatting JCL through the API, CLI and workbench.

### Modified Capabilities

## Impact

- Backend: new `src/formatter.js`; `index.js` (`/api/format`), `cli.js` (`format`).
- Frontend: new `FormatPreview.vue`; `Workbench.vue`, `PfBar.vue`, `HelpModal.vue`, `api.js`, `analyticsEvents.js`.
- Docs: README, Spec.md.
