# Proposal

## Why

Valid PROCs get false `JCLR002` errors: `&&WORK` (a temporary dataset), `&SYSUID`, symbols set by SET, and symbols supplied on the calling EXEC are all reported as undefined, and the EXEC that supplies `ENV=TEST` gets `JCLK001` because `ENV` has no default.

## What Changes

- The symbol scan skips `&&name`.
- JCL system symbols (`SYSUID` and the static and date/time system symbols) are always defined; the list lives in `keywords.js`.
- PROCs are checked call by call: a symbol is defined by a PROC default, a SET earlier in the job, or the calling EXEC. `JCLR002` names the calling step and points at the symbol in the PROC body. A PROC that is never called keeps the check against its own defaults. Catalogued PROCs from the library are checked the same way.
- On an EXEC calling a PROC, any symbol the PROC body uses is accepted as a keyword; anything else gets `JCLK001` worded "'XYZ' is not an EXEC keyword or a symbolic parameter of procedure 'P'."
- SET statements are kept on their job with the symbols they set.
- A dataset name containing a symbol anywhere (`PROD.&ENV..DATA`), not only at the start, isn't checked against the naming rules, since its value isn't known.

## Capabilities

### New Capabilities

### Modified Capabilities
- `procedure-library`: symbols in procedures are resolved per call.

## Impact

- `backend/src/rules/procRules.js`, `rules/paramRules.js`, `parser.js`, `keywords.js`, `errors.js`.
