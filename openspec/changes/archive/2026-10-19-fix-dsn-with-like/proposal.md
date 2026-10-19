# Proposal

## Why

`//NEW DD DSN=MY.NEW.FILE,LIKE=MY.MODEL.FILE,DISP=(NEW,CATLG)` is normal JCL — LIKE copies attributes from a model dataset — but `LIKE` is counted as a data source, so it gets a false `JCLD003` error with DSN.

## What Changes

- `LIKE` is no longer a data source. A DD with `LIKE=` and no DSN counts as a new temporary dataset (like `SPACE=` alone since feature 21).
- `LIKE` with `SYSOUT`, `*` or `DATA` gets `JCLD003` naming `LIKE` and the other parameter, since a model's attributes can't apply to them (feature 41 asks to confirm z/OS rejects rather than ignores it).
- The `LIKE` value is checked with the dataset name rules (`JCLS006` when empty or invalid); a member or generation isn't allowed there.

## Capabilities

### New Capabilities

### Modified Capabilities
- `dd-statement-rules`: LIKE is a model, not a data source.

## Impact

- `backend/src/rules/ddRules.js`, `rules/paramRules.js`; Features.md feature 41.
