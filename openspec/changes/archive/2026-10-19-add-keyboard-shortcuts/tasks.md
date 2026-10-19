# Tasks

## 1. Shortcuts

- [x] 1.1 Add the window `keydown` handler to `Workbench.vue` (F1, F5, F9, F12, Escape, Ctrl/Cmd+Enter, Alt+H/S/C by key code), ignoring all but Escape and F1 while help is open, with triggers counted; turn the F5 `test.fails` into a normal test; verify Workbench tests: F5 checks and the default is cancelled; Ctrl+Enter checks; F9 three times cycles back to the first sample; F1 then Escape opens and closes help; F5 while help is open does nothing; Alt+C clears; keys are ignored after the workbench is left
- [x] 1.2 Add the Undo notice for F9/F12 replacing typed text (5 seconds, exact restore, `undo/<key>` counted) and drop the `feature: 26` marker on the `undo` event; verify tests: F12 on an empty editor shows no notice; Undo after F12 restores the text; the notice disappears after 5 seconds; a keyboard-only session works

## 2. Tooltips and help

- [x] 2.1 Give each PF key a `shortcut`, show `F5 · Ctrl/⌘+Enter`-style tooltips in `PfBar.vue`, and list the keys and fallbacks in the Help dialog; verify `tests/components/PfBar.test.js` checks each tooltip

## 3. Checks and progress

- [x] 3.1 Run lint, tests and the build in both packages; verify all pass
- [x] 3.2 Note in Features.md feature 41's final checks that the keys need trying by hand in Firefox, Chrome, Safari and Edge (already listed); tick feature 26 in the Progress list; verify the box is ticked

## Workflow follow-up

- Archive the change and sync its specs.
