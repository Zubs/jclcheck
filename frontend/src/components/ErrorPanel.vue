<template>
  <div class="panel">
    <div class="panel-topline">
      <span class="panel-tabs" role="tablist">
        <button
            role="tab"
            class="panel-tab panel-tab--diagnostics"
            :aria-selected="tab === 'diagnostics'"
            @click="tab = 'diagnostics'"
        >DIAGNOSTICS</button>
        <button
            role="tab"
            class="panel-tab panel-tab--datasets"
            :aria-selected="tab === 'datasets'"
            @click="openDatasets"
        >DATASETS</button>
      </span>
      <span class="panel-topline__meta">
        <span class="checked-against" v-if="checkedAgainst">{{ checkedAgainst }}</span>
        <span class="stat is-error" v-if="stats">{{ stats.errors }} ERR</span>
        <span class="stat is-warning" v-if="stats">{{ stats.warnings }} WARN</span>
      </span>
    </div>

    <div v-if="tab === 'datasets'" class="panel-body">
      <div v-if="!datasets.length" class="panel-status">
        NO DATASETS. Datasets named with DSN= show here, step by step.
      </div>
      <div v-for="job in datasets" :key="job.job + job.steps.join()" class="flow">
        <div v-if="datasets.length > 1" class="flow-job">JOB {{ job.job }}</div>
        <table class="flow-grid">
          <thead>
            <tr>
              <th scope="col">DATASET</th>
              <th v-for="step in job.steps" :key="step" scope="col">{{ step }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in job.datasets" :key="row.name">
              <th scope="row" class="flow-name">{{ row.name }}</th>
              <td v-for="step in job.steps" :key="step">
                <button
                    v-for="(touch, i) in row.touches.filter(t => t.step === step)"
                    :key="i"
                    class="flow-cell"
                    :title="`${touch.dd} DD: ${describe(touch.actions)}`"
                    @click="$emit('select-dataset', touch)"
                >{{ touch.actions.join('') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="datasets.length" class="flow-key">N new · R read · M mod · P pass · D delete</div>
    </div>

    <div v-else class="panel-body">
      <div v-if="loading" class="panel-status">VALIDATING…</div>
      <div v-else-if="!diagnostics.length" class="panel-empty">
        <div class="panel-empty__glyph">✓</div>
        <div class="panel-empty__text">
          <strong>NO PROBLEMS FOUND</strong>
          <span v-if="stats">{{ stats.statementCount }} statements · {{
            stats.stepCount
          }} steps{{ stats.procCount ? ' · ' + stats.procCount + ' procs' : '' }} checked clean.</span>
        </div>
      </div>

      <ul v-else class="diag-list">
        <li
            v-for="(d, idx) in diagnostics"
            :key="idx"
            class="diag"
            :class="`is-${d.severity}`"
            @click="$emit('select', d)"
        >
          <div class="diag-head">
            <span class="diag-sev">{{ sevLabel(d.severity) }}</span>
            <span class="diag-loc">{{ location(d) }}</span>
            <span class="diag-code">{{ d.code }}</span>
          </div>
          <div class="diag-msg">{{ d.message }}</div>
          <div class="diag-fix" v-if="d.suggestion">
            <span class="diag-fix__label">FIX ›</span> {{ d.suggestion }}
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  diagnostics: { type: Array, default: () => [] },
  datasets: { type: Array, default: () => [] },
  stats: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  checkedAgainst: { type: String, default: '' }
});
const emit = defineEmits(['select', 'select-dataset', 'open-datasets']);

const tab = ref('diagnostics');
const ACTION_NAMES = { N: 'new', R: 'read', M: 'mod', P: 'pass', D: 'delete' };

function openDatasets() {
  if (tab.value !== 'datasets') {
    tab.value = 'datasets';
    emit('open-datasets');
  }
}

function describe(actions) {
  return actions.map(a => ACTION_NAMES[a]).join(', ');
}

// A diagnostic in a library member "CAMPBEL.PROCS.JCL(MYPROC2)" is shown
// as "MYPROC2 L3:5".
function location(d) {
  const m = d.member && d.member.match(/\(([^)]*)\)$/);
  const member = d.member ? `${m ? m[1] : d.member} ` : '';
  return `${member}L${d.line}:${d.column}`;
}

function sevLabel(sev) {
  return sev === 'error' ? 'ERR' : sev === 'warning' ? 'WARN' : 'INFO';
}
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-inset);
  border: 1px solid var(--grid-line);
  border-radius: var(--radius);
  overflow: hidden;
}

.panel-topline {
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

.panel-tabs {
  display: flex;
  gap: 12px;
}

.panel-tab {
  padding: 0;
  background: none;
  border: 0;
  font: inherit;
  letter-spacing: inherit;
  color: var(--text-dim);
  cursor: pointer;
}

.panel-tab[aria-selected="true"] {
  color: var(--field-turquoise);
  font-weight: 600;
}

.flow {
  padding: 10px 12px;
  overflow-x: auto;
}

.flow-job {
  margin-bottom: 6px;
  font-family: var(--font-cond);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-dim);
}

.flow-grid {
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 12px;
}

.flow-grid th,
.flow-grid td {
  padding: 4px 8px;
  border: 1px solid var(--grid-line);
  text-align: center;
  white-space: nowrap;
}

.flow-grid thead th {
  font-family: var(--font-cond);
  font-weight: 600;
  color: var(--field-blue);
}

.flow-grid .flow-name {
  text-align: left;
  font-weight: 400;
  color: var(--text-bright);
}

.flow-cell {
  padding: 0 2px;
  background: none;
  border: 0;
  font: inherit;
  color: var(--field-turquoise);
  cursor: pointer;
}

.flow-cell:hover,
.flow-cell:focus-visible {
  text-decoration: underline;
}

.flow-key {
  padding: 0 12px 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-faint);
}

.panel-topline__meta {
  display: flex;
  gap: 10px;
}

.stat.is-error {
  color: var(--error);
}

.stat.is-warning {
  color: var(--warning);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
}

.panel-status {
  padding: 24px 16px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-dim);
}

.panel-empty {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 20px 16px;
  font-family: var(--font-mono);
}

.panel-empty__glyph {
  color: var(--text-bright);
  font-size: 20px;
  line-height: 1;
  text-shadow: 0 0 8px currentColor;
}

.panel-empty__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--text-dim);
  font-size: 12px;
}

.panel-empty__text strong {
  color: var(--text-bright);
  letter-spacing: 0.04em;
  font-size: 12.5px;
}

.diag-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.diag {
  padding: 10px 14px;
  border-bottom: 1px solid var(--grid-line);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 12px;
  border-left: 3px solid transparent;
  transition: background 0.1s ease;
}

.diag:hover {
  background: rgba(127, 232, 154, 0.05);
}

.diag.is-error {
  border-left-color: var(--error);
}

.diag.is-warning {
  border-left-color: var(--warning);
}

.diag.is-info {
  border-left-color: var(--info);
}

.diag-head {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 4px;
  font-family: var(--font-cond);
  letter-spacing: 0.06em;
  font-size: 10.5px;
}

.diag-sev {
  font-weight: 700;
}

.diag.is-error .diag-sev {
  color: var(--error);
}

.diag.is-warning .diag-sev {
  color: var(--warning);
}

.diag.is-info .diag-sev {
  color: var(--info);
}

.diag-loc {
  color: var(--text-dim);
}

.diag-code {
  color: var(--text-faint);
  margin-left: auto;
}

.diag-msg {
  color: var(--text-bright);
  line-height: 1.45;
}

.diag-fix {
  margin-top: 5px;
  color: var(--text-dim);
  line-height: 1.4;
}

.diag-fix__label {
  color: var(--field-turquoise);
  font-weight: 600;
}
</style>
