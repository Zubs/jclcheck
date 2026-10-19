# Proposal

## Why

`errors.js` makes every `JCLK`, `JCLS` and `JCLJ` code a warning because of its prefix, whatever it means. So an EXEC with no program gets `JCLK002` as a warning, the job is `valid`, and the workbench shows "CLEAN — 0 ERRORS" for a job z/OS would reject.

## What Changes

- Every `CATALOG` entry in `errors.js` sets its own default `severity`. The prefix rule stays only as a fallback.
- **Behaviour change:** `JCLK002`, `JCLK003`, `JCLS001`, `JCLS006`, `JCLS007` and `JCLS008` become errors, since z/OS fails the job on them. `JCLK001` and the other value checks stay warnings.
- Severities that call sites passed by hand (`JCLD001`, `JCLR001`, `JCLR003`, `JCLS014`, …) move into the catalog, with the same values.
- Help shows each code's default severity; a frontend test keeps it equal to the catalog.
- Fixtures and samples that had these codes as warnings are updated.

## Capabilities

### New Capabilities
- `diagnostic-severities`: each code's default severity.

### Modified Capabilities

## Impact

- Backend: `errors.js`, call sites that passed a severity, fixture and sample expectations.
- Frontend: `diagnosticCodes.js`, `HelpModal.vue`, the Help test.
