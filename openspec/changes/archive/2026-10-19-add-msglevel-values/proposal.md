# Proposal

## Why

MSGLEVEL takes at most two sub-parameters — statements (0–2) and messages (0–1) — but any number and any value are accepted today (Nick's item 6).

## What Changes

- `MSGLEVEL` on the JOB statement gets a `list` rule from feature 14: position 1 "statements" 0–2, position 2 "messages" 0–1, either may be omitted, at least one given.
- Small integer ranges are described by listing their values ("messages must be 0 or 1"), which reads better than "a whole number from 0 to 1".
- Every invalid form gets one `JCLS009` at the value.
- Nick's item 6 fixture loses its `todo`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `statement-parameters`: adds the MSGLEVEL rule.

## Impact

- `backend/src/keywords.js`, `backend/src/valueRules.js`.
