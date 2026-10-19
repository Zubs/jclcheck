# Proposal

## Why

Two DDs with the same name in one step are valid JCL (Nick's item 18), but `JCLD001` reports them as an error, so a job whose only problem is a repeated DD counts as invalid.

## What Changes

- `JCLD001` becomes a warning. Its message says z/OS allocates both DD statements but a program can reach only one of them by that name, and its fix says to rename or remove one, or omit the name to concatenate.
- Which of the two a program gets (Nick: the last; the reference: the first) is still open in Features.md feature 41, so the message doesn't name one yet.
- Names are compared without regard to case, as today; unnamed concatenation DDs are unaffected.
- **Behaviour change:** the `broken` fixture and the broken workbench sample now expect `JCLD001` as a warning.
- Nick's item 18 fixture loses its `todo`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `dd-statement-rules`: duplicate DD names are a warning.

## Impact

- `backend/src/rules/ddRules.js`, `errors.js`; fixtures `broken`, sample `broken`, `nick/18-duplicate-dd`.
