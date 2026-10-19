<template>
  <div class="library">
    <div class="library-topline">
      <span class="library-topline__label">LIBRARY</span>
      <span class="library-topline__meta">{{ entries.length }} MEMBER{{ entries.length === 1 ? '' : 'S' }}</span>
      <button class="library-add" @click="$emit('add')">+ ADD MEMBER</button>
    </div>
    <div class="library-body">
      <p v-if="!entries.length" class="library-empty">
        Paste the catalogued procedures and INCLUDE members your job uses, with the library
        they live in, and they are checked along with the job.
      </p>
      <div
          v-for="entry in entries"
          :key="entry.id"
          :ref="el => { entryEls[entry.id] = el; }"
          class="library-entry"
      >
        <div class="library-entry__names">
          <input
              class="library-dsn"
              placeholder="LIBRARY, e.g. MY.PROCS.JCL (optional)"
              spellcheck="false"
              :value="entry.dsn"
              @input="$emit('update', entry.id, 'dsn', $event.target.value)"
          >
          <input
              class="library-member"
              placeholder="MEMBER"
              spellcheck="false"
              :value="entry.member"
              @input="$emit('update', entry.id, 'member', $event.target.value)"
          >
          <button class="library-remove" title="Remove member" @click="$emit('remove', entry.id)">✕</button>
        </div>
        <div class="library-editor">
          <Editor
              :ref="el => { editors[entry.id] = el; }"
              :label="labelOf(entry) || 'NEW MEMBER'"
              :model-value="entry.source"
              :diagnostics="diagnostics.filter(d => d.member === labelOf(entry))"
              @update:model-value="value => $emit('update', entry.id, 'source', value)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Editor from './Editor.vue';

const props = defineProps({
  entries: { type: Array, default: () => [] },
  diagnostics: { type: Array, default: () => [] }
});
defineEmits(['add', 'remove', 'update']);

const editors = {};
const entryEls = {};

// The same name the API gives diagnostics in a member: LIB(MEMBER) or MEMBER.
function labelOf(entry) {
  const member = entry.member.trim().toUpperCase();
  const dsn = entry.dsn.trim().toUpperCase();
  return dsn && member ? `${dsn}(${member})` : member;
}

function openMember(member, line) {
  const entry = props.entries.find(e => labelOf(e) === member);
  if (entry) {
    entryEls[entry.id]?.scrollIntoView?.({ block: 'nearest' });
    editors[entry.id]?.scrollToLine(line);
  }
}

defineExpose({ openMember });
</script>

<style scoped>
.library {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-inset);
  border: 1px solid var(--grid-line);
  border-radius: var(--radius);
  overflow: hidden;
}

.library-topline {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: var(--surface);
  border-bottom: 1px solid var(--grid-line);
  font-family: var(--font-cond);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

.library-topline__label {
  color: var(--field-turquoise);
  font-weight: 600;
}

.library-topline__meta {
  flex: 1;
}

.library-add,
.library-remove {
  font-family: var(--font-cond);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  background: transparent;
  border: 1px solid var(--grid-line-strong);
  border-radius: var(--radius);
  padding: 3px 8px;
  cursor: pointer;
}

.library-add:hover,
.library-remove:hover {
  color: var(--text-bright);
  border-color: var(--text-dim);
}

.library-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.library-empty {
  margin: 0;
  color: var(--text-dim);
  font-size: 12.5px;
  line-height: 1.5;
}

.library-entry__names {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.library-dsn,
.library-member {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text-primary);
  background: var(--surface);
  border: 1px solid var(--grid-line);
  border-radius: var(--radius);
  padding: 4px 8px;
  text-transform: uppercase;
}

.library-dsn {
  flex: 1;
  min-width: 0;
}

.library-member {
  width: 9em;
}

.library-editor {
  height: 220px;
}
</style>
