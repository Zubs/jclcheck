# Proposal

## Why

The editor's bar shows a fixed "COL 1" that never changes (Nick's item 1). In JCL, columns 3, 11, 16, 71 and 72 matter, so users need to see where the cursor really is.

## What Changes

- `Editor.vue` follows the cursor (selection start) on input, click, key up, select and focus, and the bar shows `LN 4 · COL 16 · 12 LINES`, counted from 1.
- With text selected, it also shows `SEL 24`.
- Column 72 and above is shown in the warning colour, since column 72 is the continuation column.
- The position isn't announced on every key press. The indicator is a button; activating it announces the position once through a polite live region.
- Line and column are worked out from the textarea's own text, so Windows line endings in pasted or loaded text don't throw them off.
- Small fix left from feature 23: the `library` analytics event loses its "not built yet" marker.

## Capabilities

### New Capabilities
- `workbench-editor`: the workbench's JCL editor — what it shows about the text and the cursor.

### Modified Capabilities

## Impact

- `frontend/src/components/Editor.vue`, `frontend/src/analyticsEvents.js`; tests in `frontend/tests/components/Editor.test.js`.
