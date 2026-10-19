<template>
  <div class="format-backdrop" @click.self="$emit('cancel')">
    <div class="format" role="dialog" aria-modal="true" aria-labelledby="format-title">
      <div class="format-topline">
        <span id="format-title" class="format-topline__label">FORMAT PREVIEW</span>
        <span class="format-topline__meta">{{ changed.length }} LINE{{ changed.length === 1 ? '' : 'S' }} CHANGED</span>
      </div>
      <ul v-if="notes.length" class="format-notes">
        <li v-for="note in notes" :key="note.line">Line {{ note.line }}: {{ note.message }}</li>
      </ul>
      <div class="format-panes">
        <section>
          <h3>BEFORE</h3>
          <pre class="format-before"><span v-for="(line, i) in beforeLines" :key="i" class="format-line"><span class="format-num">{{ i + 1 }}</span>{{ line }}
</span></pre>
        </section>
        <section>
          <h3>AFTER</h3>
          <pre class="format-after"><span
              v-for="(line, i) in afterLines"
              :key="i"
              class="format-line"
              :class="{ 'is-changed': changedSet.has(i + 1) }"
          ><span class="format-num">{{ i + 1 }}</span>{{ line }}
</span></pre>
        </section>
      </div>
      <div class="format-actions">
        <button class="format-cancel" @click="$emit('cancel')">CANCEL</button>
        <button class="format-apply" @click="$emit('apply')">APPLY</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  before: { type: String, required: true },
  after: { type: String, required: true },
  changed: { type: Array, default: () => [] },
  notes: { type: Array, default: () => [] }
});
defineEmits(['apply', 'cancel']);

const beforeLines = computed(() => props.before.split('\n'));
const afterLines = computed(() => props.after.split('\n'));
const changedSet = computed(() => new Set(props.changed));
</script>

<style scoped>
.format-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.6);
}

.format {
  display: flex;
  flex-direction: column;
  width: min(1200px, 100%);
  max-height: 100%;
  background: var(--surface-inset);
  border: 1px solid var(--grid-line-strong);
  border-radius: var(--radius);
  overflow: hidden;
}

.format-topline {
  display: flex;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--surface);
  border-bottom: 1px solid var(--grid-line);
  font-family: var(--font-cond);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

.format-topline__label {
  color: var(--field-turquoise);
  font-weight: 600;
}

.format-notes {
  margin: 0;
  padding: 8px 12px 8px 28px;
  color: var(--warning);
  font-family: var(--font-mono);
  font-size: 12px;
}

.format-panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  min-height: 0;
  overflow: auto;
  background: var(--grid-line);
}

.format-panes section {
  min-width: 0;
  background: var(--surface-inset);
}

.format-panes h3 {
  margin: 0;
  padding: 6px 12px;
  font-family: var(--font-cond);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

.format-panes pre {
  margin: 0;
  padding: 0 0 12px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text-primary);
}

.format-line {
  display: block;
  padding-right: 12px;
  white-space: pre;
}

.format-line.is-changed {
  background: rgba(127, 232, 154, 0.12);
}

.format-num {
  display: inline-block;
  width: 4ch;
  margin-right: 1ch;
  text-align: right;
  color: var(--text-faint);
  user-select: none;
}

.format-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--grid-line);
}

.format-actions button {
  font-family: var(--font-cond);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  background: transparent;
  border: 1px solid var(--grid-line-strong);
  border-radius: var(--radius);
  padding: 4px 12px;
  cursor: pointer;
}

.format-actions .format-apply {
  color: var(--text-bright);
  border-color: var(--text-dim);
}

@media (max-width: 700px) {
  .format-panes {
    grid-template-columns: 1fr;
  }
}
</style>
