# Design

## Context

`Editor.vue` is a gutter plus a `<textarea>` with `white-space: pre`, 13px mono, 21px line height and 12px/16px padding. Diagnostics only colour the gutter row.

## Decisions

1. **Layer behind the textarea.** A `<pre class="editor-highlight" aria-hidden="true">` sits in the same box as the textarea (absolute, same font, padding, line height and `white-space: pre`). The textarea's text colour becomes transparent with a visible caret. `onScroll` copies `scrollTop` and `scrollLeft` to the layer. The layer's HTML comes from one `v-html` string, built from escaped text only.
2. **`highlight.js`** exports `classifyLines(text)` → per line an array of classes per character, and `renderHtml(text, diagnostics)` which merges classes with underline severities into `<span>` runs. Line state carries only in-stream data mode (DD `*`/`DATA` with optional `DLM=`), entered after the DD statement's last continuation line; everything else is per line, so an unclosed quote stops at its line end.
3. **Hover.** The textarea gets a `title` from the diagnostics under the pointer: on `mousemove`, column = `floor((x − 16 + scrollLeft) / charWidth) + 1`, line = `floor((y − 12 + scrollTop) / 21) + 1`, where `charWidth` is measured from a hidden one-character span (7.8px if the browser reports 0). The diagnostic lookup is a plain function that is tested on its own.
4. **Ruler.** Two 1px gradients on the layer at `calc(16px + 71ch)` and `calc(16px + 79ch)`, `background-attachment: local` so they scroll with the text.
5. **Colours** are `--syn-*` tokens on `.workbench-theme`; a test parses `style.css` and checks each against `--surface-inset`.
