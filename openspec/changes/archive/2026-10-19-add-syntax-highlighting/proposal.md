# Proposal

## Why

The editor shows JCL as plain green text (Nick's item 9), and a diagnostic is only marked by a dot in the gutter, so it's hard to see which part of a line is wrong.

## What Changes

- A highlighted copy of the text is drawn behind a transparent textarea, with the same font, size, padding and scrolling, so typing, selection and undo stay native. No editor library.
- A client-side tokeniser (`highlight.js`) colours, per line: the name field, the operation, keyword names, values, quoted strings, comments (`//*` and trailing), in-stream data (`DD *`, `DD DATA`, with `DLM=`), JES2 statements, column 72 and columns 73–80 (dimmed). It runs on every keystroke, independently of the API. An unclosed quote colours only to the end of its line.
- Each diagnostic underlines its `column` and `length` in its severity colour. Hovering over underlined text shows its messages, like the gutter dot.
- A faint ruler marks columns 72 and 80.
- The colours are new `--syn-*` tokens in the workbench theme in `style.css`; each has at least 4.5:1 contrast against the editor background, checked by a test.

## Capabilities

### New Capabilities

### Modified Capabilities
- `workbench-editor`: adds syntax highlighting, diagnostic underlines and the column ruler.

## Impact

- `frontend/src/highlight.js` (new), `components/Editor.vue`, `style.css`; tests.
