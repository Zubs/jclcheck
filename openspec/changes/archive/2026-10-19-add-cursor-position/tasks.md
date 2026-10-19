# Tasks

## 1. Cursor indicator

- [x] 1.1 Track the cursor in `Editor.vue` from the textarea's own value and show `LN · COL · LINES`, `SEL n` and the column-72 style; verify `tests/components/Editor.test.js`: empty shows `LN 1 · COL 1 · 1 LINES`; a cursor after `//` shows `COL 3`; key up and click update it; end of an 80-character line shows `COL 81`, before the last character `COL 80`; column 71 isn't highlighted and 72 is; 24 selected characters show `SEL 24` and clearing hides it; `\r\n` text gives the right line and column
- [x] 1.2 Make the indicator a button that announces the position once in a polite live region; verify a test that the region is empty until the button is pressed and then reads "Line 1, column 3"
- [x] 1.3 Remove the `feature: 23` marker from the `library` event; verify analytics tests pass

## 2. Checks and progress

- [x] 2.1 Run lint, tests and the build in both packages; verify all pass
- [x] 2.2 Tick feature 24 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
