# Proposal

## Why

Nick's item 14: `DD DATA` can carry another job's JCL, for example to submit it through the internal reader. Since feature 6, `DD DATA` ends only at `/*` (or its `DLM=`), so the nested JCL is already kept as data. What's missing is telling the user that the nested job isn't checked, so a clean result isn't mistaken for "the nested job is fine".

## What Changes

- New info diagnostic `JCLD004` on a `DD DATA` statement whose data contains a JOB statement, when the same step has a DD with `SYSOUT=(class,INTRDR)`: "This in-stream JCL will be submitted as a separate job and is not checked here." Reported once per such DD.
- Nick's item 14a fixture now expects that info note (no errors).
- Tests confirm `DD DATA` keeps `//` lines and `DD *` still ends at the first `//` line.

## Capabilities

### New Capabilities
- `dd-statement-rules`: rules about DD statements — data sources, in-stream data contents, duplicates and DD-specific keywords.

### Modified Capabilities

## Impact

- `backend/src/rules/ddRules.js`, `backend/src/errors.js`.
- Fixture `nick/14a-dd-data-jcl.expected.json` gains one `info` diagnostic (intended).
