<template>
  <div class="app workbench-theme">
    <header class="header">
      <div class="header-brand">
        <router-link to="/" class="header-back" title="Back to site">← site</router-link>
        <span class="header-brand__glyph">▌</span>
        <span class="header-brand__title">JCLCHECK</span>
        <span class="header-brand__subtitle">JCL VALIDATION WORKBENCH</span>
      </div>
      <button class="header-library" :class="{ 'is-open': showLibrary }" @click="toggleLibrary">
        LIBRARY ({{ library.length }})
      </button>
      <div class="header-status">
        <span class="status-dot" :class="statusClass"></span>
        <span class="header-status__text">{{ statusText }}</span>
      </div>
    </header>

    <main class="main">
      <section class="pane pane-editor" :class="{ 'has-library': showLibrary }">
        <Editor
            ref="editorRef"
            v-model="code"
            :diagnostics="jobDiagnostics"
            @update:modelValue="onUserEdit"
            @paste="onPaste"
        />
        <LibraryPanel
            v-if="showLibrary"
            ref="libraryRef"
            :entries="library"
            :diagnostics="diagnostics"
            @add="addMember"
            @remove="removeMember"
            @update="updateMember"
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

    <div v-if="undoState" class="undo-notice" role="status">
      <span>{{ undoState.key === 'f12' ? 'Editor cleared.' : 'Sample loaded over your JCL.' }}</span>
      <button class="undo-button" @click="undoReplace">UNDO</button>
    </div>

    <PfBar
        :keys="pfKeys"
        @help="openHelp()"
        @validate="runValidation('button')"
        @sample="cycleSample()"
        @clear="clearEditor()"
    />

    <HelpModal v-if="showHelp" @close="showHelp = false"/>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick
} from 'vue';
import Editor from '../components/Editor.vue';
import ErrorPanel from '../components/ErrorPanel.vue';
import PfBar from '../components/PfBar.vue';
import HelpModal from '../components/HelpModal.vue';
import LibraryPanel from '../components/LibraryPanel.vue';
import { validateJcl } from '../api';
import { SAMPLES, SAMPLE_ORDER } from '../samples';
import { track } from '../analytics';
import {
  sizeBucket,
  checksBucket,
  timeBucket,
  latencyBucket
} from '../analyticsEvents';

const code = ref(SAMPLES.clean.code);
const diagnostics = ref([]);
const stats = ref(null);
const loading = ref(false);
const errored = ref(false);
const showHelp = ref(false);
const editorRef = ref(null);
const sampleIdx = ref(0);
// Catalogued procedures and INCLUDE members the user pastes in.
const library = ref([]);
const showLibrary = ref(false);
const libraryRef = ref(null);
const errorStatus = ref(null);
// The user's text that F9 or F12 just replaced, offered back for a few seconds.
const undoState = ref(null);
const UNDO_MS = 5000;
let undoTimer = null;
let nextMemberId = 1;

// Diagnostics inside a library member are shown in that member's editor.
const jobDiagnostics = computed(() => diagnostics.value.filter(d => !d.member));

let debounceTimer = null;

// Analytics for this visit. Only codes, triggers and buckets are counted,
// never the JCL itself.
const visit = {
  startedAt: Date.now(),
  checks: 0,
  maxLines: 0,
  responseTimes: [],
  lastResult: null,
  summarySent: false
};
const seenCodes = new Set();
const fixedCodes = new Set();
let previousCodes = new Set();
// True when the latest change came from typing, not Clear or a sample, so a
// code that disappears counts as fixed.
let lastChangeByUser = false;

function lineCount(text) {
  return text === '' ? 0 : text.split('\n').length;
}

function resultKind(resultStats) {
  if (resultStats.errors > 0) {
    return 'errors';
  }

  return resultStats.warnings > 0 ? 'warnings' : 'clean';
}

function trackDiagnostics(found) {
  const codes = new Set(found.map(d => d.code));
  for (const c of codes) {
    if (!seenCodes.has(c)) {
      seenCodes.add(c);
      track('diag/seen', c);
    }
  }

  if (lastChangeByUser) {
    for (const c of previousCodes) {
      if (!codes.has(c) && !fixedCodes.has(c)) {
        fixedCodes.add(c);
        track('diag/fixed', c);
      }
    }
  }

  previousCodes = codes;
}

function trackApiProblem(e) {
  if (e.status === 0) {
    track('api', 'unreachable');
  } else if (e.status) {
    track('api/error', e.status);
  }
}

// `trigger` is set for explicit checks; automatic checks after typing only
// count towards the visit summary.
async function runValidation(trigger) {
  if (trigger) {
    track('check', trigger);
  }

  const source = code.value;
  loading.value = true;
  errored.value = false;
  const startedAt = Date.now();
  try {
    const result = await validateJcl(source, { library: libraryForApi() });
    visit.responseTimes.push(Date.now() - startedAt);
    visit.lastResult = resultKind(result.stats);
    diagnostics.value = result.diagnostics;
    stats.value = result.stats;
    trackDiagnostics(result.diagnostics);
  } catch (e) {
    errored.value = true;
    errorStatus.value = e.status;
    console.error(e);
    trackApiProblem(e);
  } finally {
    // Counted once the check finishes, whatever its outcome.
    visit.checks++;
    visit.maxLines = Math.max(visit.maxLines, lineCount(source));
    loading.value = false;
  }
}

function sendVisitSummary() {
  if (visit.summarySent || visit.checks === 0) {
    return;
  }

  visit.summarySent = true;
  track('visit/checks', checksBucket(visit.checks));
  track('visit/lines', sizeBucket(visit.maxLines));
  track('visit/time', timeBucket(Date.now() - visit.startedAt));
  if (visit.responseTimes.length) {
    track('visit/latency', latencyBucket(visit.responseTimes));
  }

  if (visit.lastResult) {
    track('visit/end', visit.lastResult);
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    sendVisitSummary();
  }
}

function scheduleValidation() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runValidation, 450);
}

watch(code, scheduleValidation);
watch(library, scheduleValidation, { deep: true });

// Members without a name yet aren't sent; the API would reject them.
function libraryForApi() {
  return library.value
    .filter(e => e.member.trim())
    .map(e => ({ ...(e.dsn.trim() ? { dsn: e.dsn.trim().toUpperCase() } : {}), member: e.member.trim().toUpperCase(), source: e.source }));
}

function toggleLibrary() {
  showLibrary.value = !showLibrary.value;
}

function addMember() {
  library.value.push({ id: nextMemberId++, dsn: '', member: '', source: '' });
  track('library', 'add');
}

function removeMember(id) {
  library.value = library.value.filter(e => e.id !== id);
  track('library', 'remove');
}

function updateMember(id, field, value) {
  const entry = library.value.find(e => e.id === id);
  if (entry) {
    entry[field] = value;
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', sendVisitSummary);
  runValidation();
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  clearTimeout(undoTimer);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pagehide', sendVisitSummary);
  sendVisitSummary();
});

async function onSelectDiagnostic(d) {
  track('diag/click', d.code);
  if (d.member) {
    showLibrary.value = true;
    await nextTick();
    libraryRef.value?.openMember(d.member, d.line);
  } else {
    editorRef.value?.scrollToLine(d.line);
  }
}

function onUserEdit() {
  lastChangeByUser = true;
}

function onPaste(lines) {
  track('editor/paste', sizeBucket(lines));
}

function openHelp(trigger = 'button') {
  track('help/open', trigger);
  showHelp.value = true;
}

// Keeps text the user typed so the replacement can be undone.
function rememberForUndo(key) {
  clearTimeout(undoTimer);
  undoState.value = lastChangeByUser && code.value.trim() ? { text: code.value, key } : null;
  if (undoState.value) {
    undoTimer = setTimeout(() => {
      undoState.value = null;
    }, UNDO_MS);
  }
}

function undoReplace() {
  track('undo', undoState.value.key);
  code.value = undoState.value.text;
  lastChangeByUser = true;
  clearTimeout(undoTimer);
  undoState.value = null;
}

function cycleSample() {
  rememberForUndo('f9');
  sampleIdx.value = (sampleIdx.value + 1) % SAMPLE_ORDER.length;
  const key = SAMPLE_ORDER[sampleIdx.value];
  track('sample', key);
  lastChangeByUser = false;
  code.value = SAMPLES[key].code;
}

function clearEditor(trigger = 'button') {
  if (code.value === '') {
    return;
  }

  rememberForUndo('f12');
  track('clear', trigger);
  lastChangeByUser = false;
  code.value = '';
}

// F keys, with fallbacks for browsers and Macs that keep them. Alt shortcuts
// use the key's position (e.code), since Alt changes e.key on a Mac.
function onKeydown(e) {
  if (showHelp.value) {
    if (e.key === 'Escape' || e.key === 'F1') {
      e.preventDefault();
      showHelp.value = false;
    }

    return;
  }

  const mod = e.ctrlKey || e.metaKey;
  const alt = e.altKey && !mod;
  const actions = {
    F1: () => openHelp('f1'),
    F5: () => runValidation('f5'),
    F9: () => cycleSample(),
    F12: () => clearEditor('f12')
  };
  let action = actions[e.key];
  if (!action && mod && e.key === 'Enter') {
    action = () => runValidation('shortcut');
  } else if (!action && alt) {
    action = { KeyH: () => openHelp('shortcut'), KeyS: () => cycleSample(), KeyC: () => clearEditor('shortcut') }[e.code];
  }

  if (action) {
    e.preventDefault();
    action();
  }
}

const statusClass = computed(() => {
  if (loading.value) {
    return 'is-busy';
  }

  if (errored.value) {
    return 'is-offline';
  }

  if (!stats.value) {
    return 'is-busy';
  }

  return stats.value.valid ? 'is-ok' : 'is-error';
});

const statusText = computed(() => {
  if (errored.value) {
    // The workbench only sends options the API accepts, apart from the library.
    return errorStatus.value === 400 ? 'CHECK A LIBRARY MEMBER NAME' : 'API UNREACHABLE';
  }

  if (loading.value) {
    return 'VALIDATING';
  }

  if (!stats.value) {
    return 'READY';
  }

  return stats.value.valid ? 'CLEAN — 0 ERRORS' : `${stats.value.errors} ERROR${stats.value.errors === 1 ? '' : 'S'}`;
});

const pfKeys = computed(() => ([
  {
    key: 'F1',
    label: 'HELP',
    shortcut: 'Alt+H',
    event: 'help'
  },
  {
    key: 'F5',
    label: 'VALIDATE',
    shortcut: 'Ctrl/⌘+Enter',
    event: 'validate',
    primary: true
  },
  {
    key: 'F9',
    label: 'SAMPLE',
    shortcut: 'Alt+S',
    event: 'sample'
  },
  {
    key: 'F12',
    label: 'CLEAR',
    shortcut: 'Alt+C',
    event: 'clear'
  }
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

.header-back:hover {
  color: var(--text-bright);
  border-color: var(--text-dim);
}

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
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-dim);
}

.status-dot.is-ok {
  background: var(--success);
  box-shadow: 0 0 6px var(--success);
}

.status-dot.is-error {
  background: var(--error);
  box-shadow: 0 0 6px var(--error);
}

.status-dot.is-busy {
  background: var(--field-yellow);
  animation: blink-cursor 0.8s step-end infinite;
}

.status-dot.is-offline {
  background: var(--field-pink);
}

.header-status__text {
  color: var(--text-dim);
}

.undo-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-cond);
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--text-bright);
  background: var(--surface-raised);
  border: 1px solid var(--warning);
  border-radius: var(--radius);
  padding: 6px 12px;
}

.undo-button {
  font: inherit;
  color: var(--warning);
  background: transparent;
  border: 1px solid var(--warning);
  border-radius: var(--radius);
  padding: 2px 10px;
  cursor: pointer;
}

.main {
  flex: 1;
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 12px;
  min-height: 0;
}

.pane {
  min-height: 0;
  min-width: 0;
}

.pane-editor.has-library {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
}

.header-library {
  margin-left: auto;
  margin-right: 16px;
  font-family: var(--font-cond);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  background: transparent;
  border: 1px solid var(--grid-line-strong);
  border-radius: var(--radius);
  padding: 4px 10px;
  cursor: pointer;
}

.header-library:hover,
.header-library.is-open {
  color: var(--text-bright);
  border-color: var(--text-dim);
}

@media (max-width: 900px) {
  .main {
    grid-template-columns: 1fr;
    grid-template-rows: 1.4fr 1fr;
  }

  .header-brand__subtitle {
    display: none;
  }
}
</style>
