# Proposal

## Why

`DLM=` on `DD *` and `DD DATA` gets `JCLK001` (unknown keyword), and the lexer only recognises two-letter-or-digit delimiters, so `@@`, `$$` and quoted delimiters are missed (Nick's item 15). Default in-stream data also ends only at a bare `/*`, so `/* comment` doesn't end it, and `DD DATA` ends at any `//` line even though z/OS ends it only at `/*`.

## What Changes

- `DLM` is added to the DD keywords.
- A delimiter is exactly two characters: letters, digits and `$ # @` as written, anything else quoted (`DLM='%%'`, `''` for a quote).
- With `DLM=`, data ends only at a line starting in column 1 with the delimiter; `/*` and `//` lines are data.
- Without `DLM=`, `DD *` ends at `/*` followed by a blank or end of line, or at the next `//` statement; `DD DATA` ends only at `/*`.
- New diagnostics:
  - `JCLS011` (warning): a `DLM=` value that isn't two valid characters.
  - `JCLL006` (warning): in-stream data that needs an explicit delimiter (`DD DATA` or `DLM=`) reaches the end of the file without it; names the delimiter.
  - `JCLK006` (warning): `DLM=` on a DD with no in-stream data has no effect.
- Nick's item 15 fixture loses its `todo`. Nick's item 14a (`DD DATA` with JCL inside) may pass too; feature 7 adds its info note.

## Capabilities

### New Capabilities

### Modified Capabilities
- `jcl-lexing`: adds in-stream data delimiters.

## Impact

- `backend/src/lexer.js`, `keywords.js`, `errors.js`, `rules/ddRules.js`.
- Features.md feature 6 records the new codes.
