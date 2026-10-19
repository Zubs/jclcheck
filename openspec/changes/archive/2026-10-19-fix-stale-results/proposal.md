# Proposal

## Why

`runValidation` in `Workbench.vue` shows whichever reply arrives, and nothing cancels an earlier request. On a slow or reordered network, an older reply can arrive after a newer one and replace the right results with diagnostics for text that is no longer in the editor.

## What Changes

- Each check gets an `AbortController`; starting a new check (typing, F5, a level change) aborts the one in flight.
- Each check carries an increasing number, and only the newest one's reply or failure is used, for servers that ignore the abort.
- An aborted or superseded check is not an error and never shows "API UNREACHABLE".
- "VALIDATING" stays on until the newest check finishes.
- `validateJcl` in `api.js` takes an optional `signal` and passes it to `fetch`.
- The `test.fails` test for feature 35 in `Workbench.test.js` becomes a normal test.

## Capabilities

### New Capabilities

### Modified Capabilities
- `workbench-editor`: results always belong to the current text.

## Impact

- Frontend: `src/pages/Workbench.vue`, `src/api.js`, `tests/pages/Workbench.test.js`, `tests/api.test.js`.
