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
      <textarea
          ref="textareaEl"
          class="editor-textarea"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          wrap="off"
          :value="modelValue"
          @input="onInput"
          @click="updateCursor"
          @keyup="updateCursor"
          @select="updateCursor"
          @focus="updateCursor"
          @scroll="onScroll"
          @paste="onPaste"
          @keydown.tab.prevent="onTab"
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  nextTick
} from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  diagnostics: { type: Array, default: () => [] },
  label: { type: String, default: 'SOURCE' }
});

const emit = defineEmits(['update:modelValue', 'paste']);
const textareaEl = ref(null);
const cursor = ref({ line: 1, column: 1, selected: 0 });
const announcement = ref('');
const gutterEl = ref(null);
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
}

defineExpose({ scrollToLine });
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

.editor-textarea {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 21px;
  padding: 12px 16px;
  white-space: pre;
  caret-color: var(--text-bright);
}

.editor-textarea::placeholder {
  color: var(--text-faint);
}
</style>
