<template>
  <div class="editor">
    <div class="editor-topline">
      <span class="editor-topline__label">SOURCE</span>
      <span class="editor-topline__meta">{{ lineCount }} LINES · COL 1</span>
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
          @scroll="onScroll"
          @keydown.tab.prevent="onTab"
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  nextTick,
  watch
} from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  diagnostics: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:modelValue']);
const textareaEl = ref(null);
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
