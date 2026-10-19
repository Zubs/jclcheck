# Proposal

## Why

Closing or reloading the tab loses everything the user typed, including any library members.

## What Changes

- The editor text and Library members are saved to `localStorage` (`jclcheck.draft`) half a second after the last change, including changes from F9, F12 and Undo.
- On the next visit the draft is loaded (counting `draft/restored`); with nothing saved the clean sample is shown as today. A cleared editor comes back empty.
- Every storage read and write is wrapped in try/catch. If storage is blocked or full, the workbench works as normal and shows, once per visit, that the draft isn't being saved. A corrupted draft is ignored (counting `draft/corrupt`) and the sample is shown.
- The draft never leaves the browser except in checks sent to the API. Two tabs don't sync; the last change wins.
- **Test change:** the privacy test now checks that only the workbench's own storage keys (`jclcheck.draft`, `jclcheck.picker`) are written, instead of that nothing is.
- The `draft` analytics event loses its "not built yet" marker.

## Capabilities

### New Capabilities
- `workbench-drafts`: keeping the user's work in their own browser between visits.

### Modified Capabilities

## Impact

- `frontend/src/pages/Workbench.vue`, `analyticsEvents.js`; Workbench and privacy tests.
