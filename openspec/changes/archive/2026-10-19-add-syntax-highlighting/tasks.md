# Tasks

## 1. Tokeniser

- [x] 1.1 Write `frontend/src/highlight.js` (`classifyLines`, `renderHtml`, `diagnosticsAt`); verify `tests/highlight.test.js`: empty text renders nothing; `//STEP1 EXEC PGM=IEFBR14` gets name, op, keyword and value classes; each sample's continuations, comments and in-stream data are classed right (including `DLM=`); column 72 and 73–80 get their own classes; an unclosed quote stops at the line end; JES2 lines are classed; a diagnostic at line 2, column 5, length 4 underlines exactly those columns; HTML is escaped; 2,000 lines render in under 200 ms

## 2. Editor layer

- [x] 2.1 Add the highlight layer, transparent textarea, scroll syncing, ruler and hover titles to `Editor.vue`, and the `--syn-*` tokens to `style.css`; verify `tests/components/Editor.test.js`: the layer shows the coloured spans for typed text; scrolling the textarea scrolls the layer by the same amounts; a mousemove over an underlined column sets the textarea title to that diagnostic; diagnostics never block highlighting (no diagnostics still highlights)
- [x] 2.2 Add a contrast test that reads the `--syn-*` tokens from `style.css` and checks each is at least 4.5:1 against `--surface-inset`

## 3. Checks and progress

- [x] 3.1 Run lint, tests and the build in both packages; verify all pass
- [x] 3.2 Tick feature 25 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
