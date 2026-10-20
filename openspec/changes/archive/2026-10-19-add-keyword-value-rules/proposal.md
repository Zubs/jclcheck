# Proposal

## Why

Only a few keyword values are checked, each by its own hand-written function, so `TYPRUN=SCAM`, `CLASS=AB` or `PRTY=99` go unreported (Nick's item 12). Later features (MSGLEVEL, NOTIFY, JES3) need the same kind of check, so value rules should be data with one checker.

## What Changes

- New `valueRules.js` with reusable rule types — `enum`, `integer`, `char`, `name`, `quoted`, `list`, `oneOf` — and one `checkValue(rule, value)` that returns what went wrong.
- Keyword table entries can carry a `value` rule. A first set: `CLASS`, `MSGCLASS` (one character A–Z or 0–9), `TYPRUN` (SCAN, HOLD, JCLHOLD, COPY), `PRTY` (0–15), `ADDRSPC` (VIRT, REAL), `RD` (R, RNC, NR, NC), `FREE` (END, CLOSE), `AVGREC` (U, K, M), `RETPD` (0–93000), and the JES3 `//*MAIN` keywords `HOLD` (YES, NO) and `FAILURE` (RESTART, CANCEL, HOLD, PRINT).
- New warning `JCLS009` at the value's column, built from the rule ("TYPRUN must be one of SCAN, HOLD, JCLHOLD, COPY; found 'SCAM'."), with "Did you mean" for `enum` values.
- Symbolic values (`&SYM`) and referbacks (`*.`) are skipped.
- The existing hand-written checks (DISP, SPACE, DCB, REGION, TIME, DSN, RECFM, DSORG) stay as they are, with their own codes, so their established diagnostics don't change.

## Capabilities

### New Capabilities

### Modified Capabilities
- `statement-parameters`: adds keyword value rules.

## Impact

- Backend: new `valueRules.js`; `keywords.js`, `errors.js`, `rules/paramRules.js`, `rules/jesRules.js`.
- Features.md feature 14 notes why the hand-written checks keep their codes.
