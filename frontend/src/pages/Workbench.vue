<template>
  <div class="app workbench-theme">
    <header class="header">
      <div class="header-brand">
        <router-link to="/" class="header-back" title="Back to site">← site</router-link>
        <span class="header-brand__glyph">▌</span>
        <span class="header-brand__title">JCLCHECK</span>
        <span class="header-brand__subtitle">JCL VALIDATION WORKBENCH</span>
      </div>
      <div class="header-status">
        <span class="status-dot" :class="statusClass"></span>
        <span class="header-status__text">{{ statusText }}</span>
      </div>
    </header>

    <main class="main">
      <section class="pane pane-editor">
        <Editor
          ref="editorRef"
          v-model="code"
          :diagnostics="diagnostics"
        />
      </section>
      <section class="pane pane-diag">
        <ErrorPanel
          :diagnostics="diagnostics"
          :stats="stats"
          :loading="loading"
          @select="onSelectDiagnostic"
        />
      </section>
    </main>

    <PfBar
      :keys="pfKeys"
      @help="showHelp = true"
      @validate="runValidation(true)"
      @sample="cycleSample"
      @clear="clearEditor"
    />

    <HelpModal v-if="showHelp" @close="showHelp = false" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import Editor from '../components/Editor.vue';
import ErrorPanel from '../components/ErrorPanel.vue';
import PfBar from '../components/PfBar.vue';
import HelpModal from '../components/HelpModal.vue';
import { validateJcl } from '../api';
import { SAMPLES, SAMPLE_ORDER } from '../samples';

const code = ref(SAMPLES.clean.code);
const diagnostics = ref([]);
const stats = ref(null);
const loading = ref(false);
const errored = ref(false);
const showHelp = ref(false);
const editorRef = ref(null);
const sampleIdx = ref(0);

let debounceTimer = null;

async function runValidation() {
  loading.value = true;
  errored.value = false;
  try {
    const result = await validateJcl(code.value);
    diagnostics.value = result.diagnostics;
    stats.value = result.stats;
  } catch (e) {
    errored.value = true;
    console.error(e);
  } finally {
    loading.value = false;
  }
}

watch(code, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runValidation, 450);
});

onMounted(runValidation);

function onSelectDiagnostic(d) {
  editorRef.value?.scrollToLine(d.line);
}

function cycleSample() {
  sampleIdx.value = (sampleIdx.value + 1) % SAMPLE_ORDER.length;
  code.value = SAMPLES[SAMPLE_ORDER[sampleIdx.value]].code;
}

function clearEditor() {
  code.value = '';
}

const statusClass = computed(() => {
  if (loading.value) return 'is-busy';
  if (errored.value) return 'is-offline';
  if (!stats.value) return 'is-busy';
  return stats.value.valid ? 'is-ok' : 'is-error';
});

const statusText = computed(() => {
  if (errored.value) return 'API UNREACHABLE';
  if (loading.value) return 'VALIDATING';
  if (!stats.value) return 'READY';
  return stats.value.valid ? 'CLEAN — 0 ERRORS' : `${stats.value.errors} ERROR${stats.value.errors === 1 ? '' : 'S'}`;
});

const pfKeys = computed(() => ([
  { key: 'F1', label: 'HELP', event: 'help' },
  { key: 'F5', label: 'VALIDATE', event: 'validate', primary: true },
  { key: 'F9', label: 'SAMPLE', event: 'sample' },
  { key: 'F12', label: 'CLEAR', event: 'clear' }
]));
</script>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 14px 16px 16px;
  gap: 12px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--grid-line-strong);
}
.header-back {
  font-family: var(--font-cond);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  text-decoration: none;
  border: 1px solid var(--grid-line-strong);
  border-radius: var(--radius);
  padding: 4px 8px;
  margin-right: 4px;
}
.header-back:hover { color: var(--text-bright); border-color: var(--text-dim); }
.header-brand {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.header-brand__glyph {
  color: var(--text-bright);
  animation: blink-cursor 1.1s step-end infinite;
  font-size: 18px;
}
.header-brand__title {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 19px;
  letter-spacing: 0.04em;
  color: var(--text-bright);
  text-shadow: 0 0 12px rgba(184, 255, 206, 0.35);
}
.header-brand__subtitle {
  font-family: var(--font-cond);
  font-size: 11px;
  letter-spacing: 0.16em;
  color: var(--text-dim);
}

.header-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-cond);
  font-size: 11.5px;
  letter-spacing: 0.1em;
}
.status-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--text-dim);
}
.status-dot.is-ok { background: var(--success); box-shadow: 0 0 6px var(--success); }
.status-dot.is-error { background: var(--error); box-shadow: 0 0 6px var(--error); }
.status-dot.is-busy { background: var(--field-yellow); animation: blink-cursor 0.8s step-end infinite; }
.status-dot.is-offline { background: var(--field-pink); }
.header-status__text { color: var(--text-dim); }

.main {
  flex: 1;
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 12px;
  min-height: 0;
}
.pane { min-height: 0; min-width: 0; }

@media (max-width: 900px) {
  .main { grid-template-columns: 1fr; grid-template-rows: 1.4fr 1fr; }
  .header-brand__subtitle { display: none; }
}
</style>
