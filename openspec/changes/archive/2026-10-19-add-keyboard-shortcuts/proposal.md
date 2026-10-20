# Proposal

## Why

The PF-key bar suggests F1, F5, F9 and F12 work, but they are only buttons: nothing listens for the keys in any browser (Nick's item 20). Some browsers and Macs also keep F keys for themselves, so each action needs a fallback.

## What Changes

- While the workbench is open, a `keydown` listener handles F1 (help), F5 (check), F9 (next sample) and F12 (clear), cancelling the browser's own action where it allows that. Escape closes help.
- Fallbacks: Ctrl/Cmd+Enter checks; Alt+H, Alt+S and Alt+C open help, load a sample and clear. Each PF button's tooltip shows its F key and fallback, and the Help dialog lists them.
- While help is open, only Escape and F1 (which closes it) are handled.
- When F9 or F12 (key or button) replaces text the user typed, an "Undo" notice shows for 5 seconds and brings the old text back; using it counts as `undo/f9` or `undo/f12`.
- Key presses count with their trigger: `check/f5`, `check/shortcut`, `help/open/f1`, `help/open/shortcut`, `clear/f12`, `clear/shortcut`.
- The expected-failure test "checks the JCL when F5 is pressed (feature 26)" becomes a normal test.

## Capabilities

### New Capabilities
- `workbench-shortcuts`: keyboard control of the workbench and undo for text the keys replace.

### Modified Capabilities

## Impact

- `frontend/src/pages/Workbench.vue`, `components/PfBar.vue`, `components/HelpModal.vue`, `analyticsEvents.js`; tests.
