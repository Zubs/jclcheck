<template>
  <div class="app workbench-theme">
    <header class="header">
      <div class="header-brand">
        <router-link to="/" class="header-back" title="Back to site">← site</router-link>
        <span class="header-brand__glyph">▌</span>
        <span class="header-brand__title">JCLCHECK</span>
        <span class="header-brand__subtitle">JCL VALIDATION WORKBENCH</span>
      </div>
      <div v-if="levels.length" class="header-picker">
        <select class="level-picker" aria-label="z/OS level" :value="zosLevel" @change="onLevelChange">
          <option v-for="l in levels" :key="l.level" :value="l.level">z/OS {{ l.level }}</option>
        </select>
        <select class="jes-picker" aria-label="JES" :value="jes" @change="onJesChange">
          <option value="JES2">JES2</option>
          <option value="JES3" :disabled="!jes3At(zosLevel)">JES3</option>
        </select>
      </div>
      <button class="header-library" :class="{ 'is-open': showLibrary }" @click="toggleLibrary">
        LIBRARY ({{ library.length }})
      </button>
      <div class="header-status">
        <span class="status-dot" :class="statusClass"></span>
        <span class="header-status__text">{{ statusText }}</span>
      </div>
    </header>

    <div v-if="pickerNotice" class="picker-notice" role="status">{{ pickerNotice }}</div>
    <div v-if="draftNotSaved" class="picker-notice draft-notice" role="status">
      Your JCL isn't being saved in this browser, so it will be gone when you leave.
    </div>

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
            :datasets="datasets"
            :stats="stats"
            :checked-against="checkedAgainst"
            :loading="loading"
            @select="onSelectDiagnostic"
            @select-dataset="onSelectDataset"
            @open-datasets="track('datasets', 'open')"
        />
      </section>
    </main>

    <div v-if="sharedView" class="share-notice" role="status">
      <span>You're looking at a shared link. Your own draft is kept until you edit this one.</span>
      <button class="back-to-draft" @click="backToDraft">BACK TO MY DRAFT</button>
    </div>
    <div v-if="shareMessage" class="share-notice share-message" role="status">
      <span>{{ shareMessage.text }}</span>
      <input v-if="shareMessage.link" class="share-link" readonly :value="shareMessage.link" @focus="$event.target.select()">
      <button class="share-dismiss" title="Dismiss" @click="shareMessage = null">✕</button>
    </div>
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
        @share="shareJob()"
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
import { validateJcl, getLevels } from '../api';
import { shareLink, decodeShare } from '../share';
import { SAMPLES, SAMPLE_ORDER } from '../samples';
import { track } from '../analytics';
import {
  sizeBucket,
  checksBucket,
  timeBucket,
  latencyBucket
} from '../analyticsEvents';

// The user's draft (JCL and library members) stays in this browser between
// visits. Storage can be blocked or full, so every access is guarded and the
// workbench carries on without it.
const DRAFT_KEY = 'jclcheck.draft';
const SAVE_DELAY_MS = 500;
const draftNotSaved = ref(false);
let draftStatus = null; // 'restored' or 'corrupt', counted once mounted

function isDraft(d) {
  const text = v => typeof v === 'string';
  return d && text(d.code) && Array.isArray(d.library) &&
    d.library.every(e => e && text(e.dsn) && text(e.member) && text(e.source));
}

function loadDraft() {
  let raw;
  try {
    raw = localStorage.getItem(DRAFT_KEY);
  } catch {
    draftNotSaved.value = true;
    return null;
  }

  if (raw === null) {
    return null;
  }

  try {
    const draft = JSON.parse(raw);
    if (isDraft(draft)) {
      draftStatus = 'restored';
      return draft;
    }
  } catch {
    // Unreadable: treated like a draft that doesn't fit, below.
  }

  draftStatus = 'corrupt';
  return null;
}

const draft = loadDraft();
const code = ref(draft ? draft.code : SAMPLES.clean.code);
const diagnostics = ref([]);
const datasets = ref([]);
const stats = ref(null);
const loading = ref(false);
const errored = ref(false);
const showHelp = ref(false);
const editorRef = ref(null);
const sampleIdx = ref(0);
// Catalogued procedures and INCLUDE members the user pastes in.
const library = ref((draft ? draft.library : []).map((e, i) => ({ id: i + 1, ...e })));
const showLibrary = ref(false);
const libraryRef = ref(null);
const errorStatus = ref(null);
// The z/OS level and JES to check against, from GET /api/levels. If the
// levels can't be loaded the picker is hidden and the API's defaults apply.
const levels = ref([]);
const zosLevel = ref(null);
const jes = ref(null);
const pickerNotice = ref('');
const checkedAgainst = ref('');
const PICKER_KEY = 'jclcheck.picker';

// Sharing: a link opened from someone else shows their job without replacing
// the user's draft until they edit it.
const sharedView = ref(false);
const shareMessage = ref(null);
let draftBeforeShare = null;

// The user's text that F9 or F12 just replaced, offered back for a few seconds.
const undoState = ref(null);
const UNDO_MS = 5000;
let undoTimer = null;
let nextMemberId = library.value.length + 1;

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
// A restored draft is the user's own text, so replacing it can be undone.
let lastChangeByUser = Boolean(draft);

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
// Only the newest check's reply is used: starting a check aborts the one in
// flight, and the number catches replies from servers that ignore the abort.
let checkNumber = 0;
let inFlight = null;

async function runValidation(trigger) {
  if (trigger) {
    track('check', trigger);
  }

  const source = code.value;
  const number = ++checkNumber;
  inFlight?.abort();
  const controller = new AbortController();
  inFlight = controller;
  loading.value = true;
  errored.value = false;
  const startedAt = Date.now();
  try {
    const result = await validateJcl(source, { library: libraryForApi(), zosLevel: zosLevel.value, jes: jes.value, signal: controller.signal });
    if (number !== checkNumber) {
      return;
    }

    checkedAgainst.value = result.zosLevel ? `Z/OS ${result.zosLevel} · ${result.jes}` : '';
    visit.responseTimes.push(Date.now() - startedAt);
    visit.lastResult = resultKind(result.stats);
    diagnostics.value = result.diagnostics;
    datasets.value = result.datasets || [];
    stats.value = result.stats;
    trackDiagnostics(result.diagnostics);
  } catch (e) {
    if (number !== checkNumber) {
      return;
    }

    errored.value = true;
    errorStatus.value = e.status;
    console.error(e);
    trackApiProblem(e);
  } finally {
    // Counted once the check finishes, whatever its outcome.
    visit.checks++;
    visit.maxLines = Math.max(visit.maxLines, lineCount(source));
    if (number === checkNumber) {
      loading.value = false;
      inFlight = null;
    }
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

let saveTimer = null;

function saveDraft() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      code: code.value,
      library: library.value.map(({ dsn, member, source }) => ({ dsn, member, source }))
    }));
  } catch {
    draftNotSaved.value = true;
  }
}

watch([code, library], () => {
  if (sharedView.value) {
    return; // a shared job only becomes the draft once the user edits it
  }

  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, SAVE_DELAY_MS);
}, { deep: true });

// A change still waiting to be saved isn't lost when the page goes.
function flushDraft() {
  if (saveTimer) {
    saveDraft();
  }
}

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
  sharedView.value = false;
  library.value.push({ id: nextMemberId++, dsn: '', member: '', source: '' });
  track('library', 'add');
}

function removeMember(id) {
  sharedView.value = false;
  library.value = library.value.filter(e => e.id !== id);
  track('library', 'remove');
}

function updateMember(id, field, value) {
  sharedView.value = false;
  const entry = library.value.find(e => e.id === id);
  if (entry) {
    entry[field] = value;
  }
}

function jes3At(level) {
  return Boolean(levels.value.find(l => l.level === level)?.jes3);
}

function readStoredPicker() {
  try {
    return JSON.parse(localStorage.getItem(PICKER_KEY)) || {};
  } catch {
    return {};
  }
}

// Remembered for the next visit and kept in the address, so a shared link
// checks the same way. replaceState, not the router, so it isn't a new page view.
function rememberPicker() {
  try {
    localStorage.setItem(PICKER_KEY, JSON.stringify({ zosLevel: zosLevel.value, jes: jes.value }));
  } catch {
    // Blocked storage only means the choice isn't remembered.
  }

  const url = new URL(window.location.href);
  url.searchParams.set('zos', zosLevel.value);
  url.searchParams.set('jes', jes.value);
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}

// The address wins over storage; anything unusable falls back with a notice.
async function loadLevels() {
  let data;
  try {
    data = await getLevels();
  } catch {
    return;
  }

  levels.value = data.levels;
  const params = new URLSearchParams(window.location.search);
  const stored = readStoredPicker();
  let level = params.get('zos') || stored.zosLevel || data.defaultLevel;
  if (!data.levels.some(l => l.level === level)) {
    if (params.get('zos')) {
      pickerNotice.value = `z/OS ${level} isn't supported, so this checks against z/OS ${data.defaultLevel}.`;
    }

    level = data.defaultLevel;
  }

  let chosenJes = params.get('jes') || stored.jes || data.defaultJes;
  if (chosenJes !== 'JES2' && chosenJes !== 'JES3') {
    chosenJes = data.defaultJes;
  }

  zosLevel.value = level;
  if (chosenJes === 'JES3' && !jes3At(level)) {
    if (params.get('jes')) {
      pickerNotice.value = `IBM removed JES3 in z/OS 3.1, so z/OS ${level} is checked for JES2.`;
    }

    chosenJes = 'JES2';
  }

  jes.value = chosenJes;
}

function onLevelChange(e) {
  zosLevel.value = e.target.value;
  track('level', zosLevel.value);
  pickerNotice.value = '';
  if (jes.value === 'JES3' && !jes3At(zosLevel.value)) {
    jes.value = 'JES2';
    pickerNotice.value = `IBM removed JES3 in z/OS 3.1, so this now checks for JES2.`;
  }

  rememberPicker();
  runValidation();
}

function onJesChange(e) {
  jes.value = e.target.value;
  track('jes', jes.value);
  pickerNotice.value = '';
  rememberPicker();
  runValidation();
}

onMounted(async () => {
  if (draftStatus) {
    track('draft', draftStatus);
  }

  window.addEventListener('pagehide', flushDraft);
  window.addEventListener('keydown', onKeydown);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', sendVisitSummary);
  await loadLevels();
  await openSharedLink();
  // Loading a shared job schedules a check; the one below replaces it.
  await nextTick();
  clearTimeout(debounceTimer);
  runValidation();
});

onBeforeUnmount(() => {
  flushDraft();
  window.removeEventListener('pagehide', flushDraft);
  window.removeEventListener('keydown', onKeydown);
  clearTimeout(undoTimer);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pagehide', sendVisitSummary);
  sendVisitSummary();
});

function onSelectDiagnostic(d) {
  track('diag/click', d.code);
  return goTo(d);
}

function onSelectDataset(touch) {
  track('datasets', 'cell-click');
  return goTo(touch);
}

// Goes to a line in the editor, or in a library member.
async function goTo(d) {
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
  sharedView.value = false;
}

function memberCopies() {
  return library.value.map(({ dsn, member, source }) => ({ dsn, member, source }));
}

async function shareJob() {
  if (!code.value.trim()) {
    shareMessage.value = { text: 'There is nothing to share yet.' };
    return;
  }

  const link = await shareLink(window.location.origin, { jcl: code.value, library: memberCopies(), zosLevel: zosLevel.value, jes: jes.value });
  if (!link) {
    shareMessage.value = { text: 'This job is too long to share as a link (over 32 KB).' };
    return;
  }

  track('share', 'create');
  try {
    await navigator.clipboard.writeText(link);
    shareMessage.value = { text: 'Link copied. Anyone who opens it sees this job, checked the same way.' };
  } catch {
    track('share', 'clipboard-blocked');
    shareMessage.value = { text: 'Copy this link:', link };
  }
}

async function openSharedLink() {
  const fragment = window.location.hash.match(/^#jcl=(.*)$/);
  if (!fragment) {
    return;
  }

  let shared;
  try {
    shared = await decodeShare(fragment[1]);
  } catch {
    shareMessage.value = { text: 'This link is incomplete or damaged.' };
    return;
  }

  draftBeforeShare = { code: code.value, library: memberCopies() };
  sharedView.value = true;
  code.value = shared.jcl;
  library.value = shared.library.map(e => ({ id: nextMemberId++, ...e }));
  lastChangeByUser = false;
  track('share', 'open');
}

function backToDraft() {
  track('share', 'back-to-draft');
  sharedView.value = false;
  code.value = draftBeforeShare.code;
  library.value = draftBeforeShare.library.map(e => ({ id: nextMemberId++, ...e }));
  lastChangeByUser = true;
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
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
    F6: () => shareJob(),
    F1: () => openHelp('f1'),
    F5: () => runValidation('f5'),
    F9: () => cycleSample(),
    F12: () => clearEditor('f12')
  };
  let action = actions[e.key];
  if (!action && mod && e.key === 'Enter') {
    action = () => runValidation('shortcut');
  } else if (!action && alt) {
    action = {
      KeyH: () => openHelp('shortcut'),
      KeyS: () => cycleSample(),
      KeyC: () => clearEditor('shortcut'),
      KeyL: () => shareJob()
    }[e.code];
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
    key: 'F6',
    label: 'SHARE',
    shortcut: 'Alt+L',
    event: 'share'
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

.share-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-cond);
  font-size: 12px;
  color: var(--text-bright);
  background: var(--surface-raised);
  border: 1px solid var(--grid-line-strong);
  border-radius: var(--radius);
  padding: 6px 12px;
}

.share-link {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-primary);
  background: var(--surface);
  border: 1px solid var(--grid-line);
  border-radius: var(--radius);
  padding: 3px 6px;
}

.back-to-draft,
.share-dismiss {
  font: inherit;
  color: var(--text-bright);
  background: transparent;
  border: 1px solid var(--grid-line-strong);
  border-radius: var(--radius);
  padding: 2px 10px;
  cursor: pointer;
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

.header-picker {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.level-picker,
.jes-picker {
  font-family: var(--font-cond);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-bright);
  background: var(--surface);
  border: 1px solid var(--grid-line-strong);
  border-radius: var(--radius);
  padding: 3px 6px;
}

.picker-notice {
  font-family: var(--font-cond);
  font-size: 12px;
  color: var(--warning);
}

.header-library {
  margin-left: 12px;
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
