<template>
  <div class="editor">
    <div class="editor-topline">
      <span class="editor-topline__label">{{ label }}</span>
      <button
          class="editor-topline__meta editor-cursor"
          type="button"
          title="Cursor position (press to have it read out)"
          @click="announcePosition"
      >
        LN {{ cursor.line }} · <span class="editor-cursor__col" :class="{ 'is-past-71': cursor.column >= 72 }">COL {{ cursor.column }}</span>
        <template v-if="cursor.selected"> · SEL {{ cursor.selected }}</template>
        · {{ lineCount }} LINES
      </button>
      <span class="sr-only" aria-live="polite">{{ announcement }}</span>
    </div>
    <div class="editor-body">
      <div ref="gutterEl" class="editor-gutter" aria-hidden="true">
        <div
            v-for="n in lineCount"
            :key="n"
            class="editor-gutter__row"
            :class="gutterClass(n)"
            :title="gutterTitle(n)"
        >
          <span class="editor-gutter__num">{{ String(n).padStart(3, '0') }}</span>
          <span class="editor-gutter__dot" v-if="lineSeverity(n)"></span>
        </div>
      </div>
      <div class="editor-text">
        <!-- eslint-disable-next-line vue/no-v-html -- built from escaped text in highlight.js -->
        <pre ref="highlightEl" class="editor-highlight" aria-hidden="true" v-html="highlighted"></pre>
        <span ref="measureEl" class="editor-measure" aria-hidden="true">X</span>
        <textarea
            ref="textareaEl"
            class="editor-textarea"
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            wrap="off"
            :value="modelValue"
            :title="hoverTitle"
            @input="onInput"
            @click="updateCursor"
            @keyup="updateCursor"
            @select="updateCursor"
            @focus="updateCursor"
            @scroll="onScroll"
            @paste="onPaste"
            @keydown.tab.prevent="onTab"
            @mousemove="onHover"
            @mouseleave="hideSoon"
        ></textarea>
        <div
            v-if="panel"
            class="explain-panel"
            role="tooltip"
            :style="{ top: `${panel.top}px`, left: `${panel.left}px` }"
            @mouseenter="cancelHide"
            @mouseleave="hidePanel"
        >
          <p v-for="(d, i) in panel.diagnostics" :key="i" class="explain-diag" :class="`is-${d.severity}`">
            {{ d.code }}: {{ d.message }}
          </p>
          <template v-if="panel.explanation.unknown">
            <p class="explain-text">No description: not a known keyword.</p>
          </template>
          <template v-else>
            <p class="explain-head"><strong>{{ panel.explanation.keyword }}</strong> {{ panel.explanation.text }}</p>
            <ul v-if="panel.explanation.parts.length" class="explain-parts">
              <li v-for="(part, i) in panel.explanation.parts" :key="i">
                <code>{{ part.value || '(none)' }}</code>
                <span v-if="part.label" class="explain-label">{{ part.label }}:</span>
                {{ part.text }}
              </li>
            </ul>
            <p class="explain-meta">
              {{ panel.explanation.since ? `Since z/OS ${panel.explanation.since}.` : 'In every supported z/OS level.' }}
              <a v-if="panel.explanation.reference" :href="panel.explanation.reference" target="_blank" rel="noopener">IBM JCL Reference ↗</a>
            </p>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  nextTick
} from 'vue';
import { renderHtml, diagnosticsAt } from '../highlight';
import { explainAt } from '../explain';

const props = defineProps({
  modelValue: { type: String, default: '' },
  diagnostics: { type: Array, default: () => [] },
  label: { type: String, default: 'SOURCE' },
  // Keyword descriptions from GET /api/keywords, or null when not loaded.
  keywords: { type: Object, default: null }
});

const emit = defineEmits(['update:modelValue', 'paste', 'explain']);
const textareaEl = ref(null);
const cursor = ref({ line: 1, column: 1, selected: 0 });
const announcement = ref('');
const gutterEl = ref(null);
const highlightEl = ref(null);
const measureEl = ref(null);
const hoverTitle = ref('');
// The explanation panel (feature 40), with any diagnostics at the same place.
const panel = ref(null);
let hideTimer = null;
const highlighted = computed(() => renderHtml(props.modelValue, props.diagnostics));
const lineCount = computed(() => {
  const n = props.modelValue.split('\n').length;
  return Math.max(n, 1);
});

const lineSeverityMap = computed(() => {
  const map = new Map();
  const rank = {
    error: 3,
    warning: 2,
    info: 1
  };

  for (const d of props.diagnostics) {
    const cur = map.get(d.line);
    if (!cur || rank[d.severity] > rank[cur]) {
      map.set(d.line, d.severity);
    }
  }

  return map;
});

const lineMessagesMap = computed(() => {
  const map = new Map();
  for (const d of props.diagnostics) {
    if (!map.has(d.line)) {
      map.set(d.line, []);
    }

    map.get(d.line).push(`${d.code}: ${d.message}`);
  }

  return map;
});

function lineSeverity(n) {
  return lineSeverityMap.value.get(n);
}

function gutterClass(n) {
  const sev = lineSeverity(n);
  return sev ? `is-${sev}` : '';
}

function gutterTitle(n) {
  const msgs = lineMessagesMap.value.get(n);
  return msgs ? msgs.join('\n') : '';
}

function onInput(e) {
  panel.value = null;
  emit('update:modelValue', e.target.value);
  updateCursor();
}

// Worked out from the textarea's own text, which the browser keeps with
// plain \n line endings, so pasted \r\n text can't throw the count off.
function updateCursor() {
  const el = textareaEl.value;
  if (!el) {
    return;
  }

  const before = el.value.slice(0, el.selectionStart).replace(/\r/g, '').split('\n');
  cursor.value = {
    line: before.length,
    column: before[before.length - 1].length + 1,
    selected: Math.abs(el.selectionEnd - el.selectionStart)
  };
}

// Screen readers hear the position only when they ask for it, not on every key.
function announcePosition() {
  announcement.value = `Line ${cursor.value.line}, column ${cursor.value.column}`;
}

// Reports only how many lines were pasted; the text stays in the editor.
function onPaste(e) {
  const text = e.clipboardData?.getData('text') ?? '';
  if (text) {
    emit('paste', text.replace(/\r?\n$/, '').split(/\r?\n/).length);
  }
}

function onScroll(e) {
  if (gutterEl.value) {
    gutterEl.value.scrollTop = e.target.scrollTop;
  }

  if (highlightEl.value) {
    highlightEl.value.scrollTop = e.target.scrollTop;
    highlightEl.value.scrollLeft = e.target.scrollLeft;
  }
}

// Same layout numbers as the textarea's CSS below.
const PAD_LEFT = 16;
const PAD_TOP = 12;
const LINE_HEIGHT = 21;

function charWidth() {
  return measureEl.value?.getBoundingClientRect().width || 7.8;
}

// Shows the panel for the keyword or value at a place, below its line.
// Returns whether there was anything to explain.
function showPanel(line, column) {
  const explanation = explainAt(props.modelValue, line, column, props.keywords);
  if (!explanation) {
    panel.value = null;
    return false;
  }

  const el = textareaEl.value;
  cancelHide();
  panel.value = {
    line,
    column,
    explanation,
    diagnostics: diagnosticsAt(props.diagnostics, line, column),
    top: PAD_TOP + line * LINE_HEIGHT - el.scrollTop,
    left: Math.max(PAD_LEFT + (column - 1) * charWidth() - el.scrollLeft, 0)
  };
  return true;
}

// Explains what is under the pointer; diagnostics alone keep the plain tooltip.
function onHover(e) {
  const el = textareaEl.value;
  const rect = el.getBoundingClientRect();
  const column = Math.floor((e.clientX - rect.left - PAD_LEFT + el.scrollLeft) / charWidth()) + 1;
  const line = Math.floor((e.clientY - rect.top - PAD_TOP + el.scrollTop) / LINE_HEIGHT) + 1;
  if (panel.value && panel.value.line === line && panel.value.column === column) {
    return;
  }

  const shown = showPanel(line, column);
  if (shown) {
    emit('explain', 'mouse');
  }

  hoverTitle.value = shown ? '' : diagnosticsAt(props.diagnostics, line, column).map(d => `${d.code}: ${d.message}`).join('\n');
}

function cancelHide() {
  clearTimeout(hideTimer);
}

function hideSoon() {
  cancelHide();
  hideTimer = setTimeout(hidePanel, 300);
}

function hidePanel() {
  panel.value = null;
}

/** Alt+K: explains the keyword at the cursor. */
function explainAtCursor() {
  updateCursor();
  return showPanel(cursor.value.line, cursor.value.column);
}

function onTab(e) {
  const el = e.target;
  const start = el.selectionStart, end = el.selectionEnd;
  const val = props.modelValue;
  const next = val.slice(0, start) + '  ' + val.slice(end);
  emit('update:modelValue', next);
  nextTick(() => {
    el.selectionStart = el.selectionEnd = start + 2;
  });
}

function scrollToLine(line) {
  const el = textareaEl.value;
  if (!el) {
    return;
  }

  const lines = props.modelValue.split('\n');
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1;
  }

  const lineText = lines[line - 1] || '';
  el.focus();
  el.setSelectionRange(offset, offset + lineText.length);
  updateCursor();
  const lineHeight = 21;
  const target = Math.max(0, (line - 1) * lineHeight - el.clientHeight / 2);
  el.scrollTop = target;
  if (gutterEl.value) {
    gutterEl.value.scrollTop = target;
  }

  if (highlightEl.value) {
    highlightEl.value.scrollTop = target;
  }
}

defineExpose({ scrollToLine, explainAtCursor });
</script>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-inset);
  border: 1px solid var(--grid-line);
  border-radius: var(--radius);
  overflow: hidden;
}

.editor-topline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: var(--surface);
  border-bottom: 1px solid var(--grid-line);
  font-family: var(--font-cond);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

.editor-topline__label {
  color: var(--field-turquoise);
  font-weight: 600;
}

.editor-cursor {
  font: inherit;
  letter-spacing: inherit;
  color: inherit;
  background: none;
  border: none;
  padding: 0;
  cursor: default;
}

.editor-cursor__col.is-past-71 {
  color: var(--warning);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.editor-body {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
}

.editor-gutter {
  flex: 0 0 auto;
  overflow: hidden;
  background: var(--surface);
  border-right: 1px solid var(--grid-line);
  padding: 12px 0;
  user-select: none;
}

.editor-gutter__row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 21px;
  padding: 0 8px 0 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-faint);
  white-space: nowrap;
}

.editor-gutter__row.is-error {
  color: var(--error);
}

.editor-gutter__row.is-warning {
  color: var(--warning);
}

.editor-gutter__row.is-info {
  color: var(--info);
}

.editor-gutter__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 4px currentColor;
}

.editor-text {
  flex: 1;
  position: relative;
  min-width: 0;
}

/* The highlight layer and the textarea share every measurement, so the
   coloured text sits exactly under the (transparent) typed text. */
.editor-highlight,
.editor-textarea {
  position: absolute;
  inset: 0;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 21px;
  padding: 12px 16px;
  white-space: pre;
  tab-size: 8;
}

.editor-highlight {
  overflow: hidden;
  color: var(--text-primary);
  pointer-events: none;
  /* Faint rulers at columns 72 and 80, scrolling with the text. */
  background-image:
    linear-gradient(var(--syn-ruler), var(--syn-ruler)),
    linear-gradient(var(--syn-ruler), var(--syn-ruler));
  background-size: 1px 100%;
  background-repeat: no-repeat;
  background-position: calc(16px + 71ch) 0, calc(16px + 79ch) 0;
  background-attachment: local;
}

.editor-measure {
  position: absolute;
  visibility: hidden;
  font-family: var(--font-mono);
  font-size: 13px;
}

.editor-highlight :deep(.t-name) { color: var(--syn-name); }
.editor-highlight :deep(.t-op) { color: var(--syn-op); font-weight: 600; }
.editor-highlight :deep(.t-kw) { color: var(--syn-kw); }
.editor-highlight :deep(.t-val) { color: var(--syn-val); }
.editor-highlight :deep(.t-str) { color: var(--syn-str); }
.editor-highlight :deep(.t-cmt) { color: var(--syn-cmt); font-style: italic; }
.editor-highlight :deep(.t-data) { color: var(--syn-data); }
.editor-highlight :deep(.t-jes) { color: var(--syn-jes); }
.editor-highlight :deep(.t-cont) { color: var(--syn-cont); font-weight: 700; }
.editor-highlight :deep(.t-seq) { color: var(--syn-seq); }
.editor-highlight :deep(.u-error) { text-decoration: underline wavy var(--error); text-underline-offset: 3px; }
.editor-highlight :deep(.u-warning) { text-decoration: underline wavy var(--warning); text-underline-offset: 3px; }
.editor-highlight :deep(.u-info) { text-decoration: underline dotted var(--info); text-underline-offset: 3px; }

.editor-textarea {
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  color: transparent;
  caret-color: var(--text-bright);
  overflow: auto;
}

.editor-textarea::placeholder {
  color: var(--text-faint);
}
.explain-panel {
  position: absolute;
  z-index: 5;
  max-width: min(480px, 90%);
  padding: 8px 10px;
  background: var(--surface);
  border: 1px solid var(--grid-line-strong);
  border-radius: var(--radius);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  font-family: var(--font-sans);
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text-primary);
}

.explain-panel p {
  margin: 0 0 4px;
}

.explain-diag {
  font-family: var(--font-mono);
  font-size: 12px;
}

.explain-diag.is-error {
  color: var(--error);
}

.explain-diag.is-warning {
  color: var(--warning);
}

.explain-diag.is-info {
  color: var(--info);
}

.explain-head strong {
  font-family: var(--font-mono);
  color: var(--field-turquoise);
}

.explain-parts {
  margin: 4px 0;
  padding-left: 16px;
}

.explain-parts code {
  font-family: var(--font-mono);
  color: var(--text-bright);
}

.explain-label {
  color: var(--text-dim);
}

.explain-meta {
  color: var(--text-dim);
  font-size: 11.5px;
}

.explain-meta a {
  margin-left: 6px;
  color: var(--field-turquoise);
}
</style>
