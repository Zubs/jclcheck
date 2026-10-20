# Proposal

## Why

EXEC keywords can be qualified with a procedure step (`COND.PAID=`, `REGION.S1=4M`) to override one step of a called procedure. Today the whole `COND.PAID` is looked up as a keyword and gets `JCLK001`, so Nick's item 2 example (from the JCL Reference) gets three false warnings.

## What Changes

- On EXEC, `keyword.procstep=value` is split: the keyword is checked against the EXEC table (with "Did you mean"), and its value with the usual value checks.
- Only `COND`, `REGION`, `TIME`, `PARM`, `ACCT`, `ADDRSPC`, `DPRTY`, `PERFORM` and `RD` can be qualified; others (`PGM.S1=`) get the new warning `JCLK008`.
- The procedure step name must be a valid name (`JCLN001`). When the procedure is in-stream, the step must exist in it (new warning `JCLR004`, naming the PROC and listing its steps); catalogued procedures aren't checked.
- A qualified keyword on an `EXEC PGM=` step gets the new error `JCLK009`.
- Nick's item 2 fixture loses its `todo`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `statement-parameters`: adds procedure-step-qualified EXEC keywords.

## Impact

- `backend/src/rules/paramRules.js`, `keywords.js`, `errors.js`; Features.md feature 30's code list.
