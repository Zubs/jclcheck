<template>
  <div class="profile">
    <div class="profile-topline">
      <span class="profile-topline__label">SITE PROFILE</span>
      <span class="profile-topline__meta">{{ status }}</span>
      <span class="profile-views" role="tablist">
        <button role="tab" class="profile-view profile-view--form" :aria-selected="view === 'form'" @click="view = 'form'">FORM</button>
        <button role="tab" class="profile-view profile-view--json" :aria-selected="view === 'json'" @click="view = 'json'">JSON</button>
      </span>
      <button class="profile-example" @click="$emit('update', EXAMPLE)">EXAMPLE</button>
    </div>
    <div class="profile-body">
      <template v-if="view === 'form'">
        <p v-if="jsonProblem" class="profile-problem" role="status">
          The JSON view has a mistake, so the form can't show it. Fix it there, or clear it.
        </p>
        <form v-else class="profile-form" @submit.prevent>
          <fieldset>
            <legend>Name patterns <span class="profile-hint">* for any characters, % for one; separate with commas</span></legend>
            <label v-for="kind in NAME_KINDS" :key="kind.key">
              <span>{{ kind.label }}</span>
              <input
                  :class="`profile-names-${kind.key}`"
                  spellcheck="false"
                  :value="listText(profile.names && profile.names[kind.key])"
                  @change="setList(['names', kind.key], $event.target.value)"
              >
            </label>
          </fieldset>

          <fieldset>
            <legend>Allowed values <span class="profile-hint">for a keyword on any statement</span></legend>
            <div v-for="(values, keyword) in profile.allowed || {}" :key="keyword" class="profile-row">
              <code>{{ keyword }}</code>
              <input
                  class="profile-allowed-values"
                  spellcheck="false"
                  :value="listText(values)"
                  @change="setList(['allowed', keyword], $event.target.value)"
              >
              <button type="button" class="profile-remove" :title="`Remove ${keyword}`" @click="remove(['allowed', keyword])">✕</button>
            </div>
            <div class="profile-row">
              <input v-model="newAllowed.keyword" class="profile-new-keyword" placeholder="KEYWORD, e.g. CLASS" spellcheck="false">
              <input v-model="newAllowed.values" class="profile-new-values" placeholder="values, e.g. A, B" spellcheck="false">
              <button type="button" class="profile-add profile-add-allowed" @click="addAllowed">ADD</button>
            </div>
          </fieldset>

          <fieldset>
            <legend>New dataset prefixes <span class="profile-hint">first qualifiers allowed for DISP=NEW</span></legend>
            <input
                class="profile-prefixes"
                spellcheck="false"
                :value="listText(profile.dsnPrefixes)"
                @change="setList(['dsnPrefixes'], $event.target.value)"
            >
          </fieldset>

          <fieldset>
            <legend>Extra keywords <span class="profile-hint">your site's own keywords, accepted without a warning</span></legend>
            <label v-for="stmt in STATEMENTS" :key="stmt">
              <span>{{ stmt }}</span>
              <input
                  :class="`profile-extra-${stmt.toLowerCase()}`"
                  spellcheck="false"
                  :value="listText(profile.extraKeywords && profile.extraKeywords[stmt])"
                  @change="setList(['extraKeywords', stmt], $event.target.value)"
              >
            </label>
          </fieldset>

          <fieldset>
            <legend>Severities <span class="profile-hint">a different severity for a code, or off</span></legend>
            <div v-for="(severity, code) in profile.severity || {}" :key="code" class="profile-row">
              <code>{{ code }}</code>
              <select class="profile-severity" :value="severity" @change="set(['severity', code], $event.target.value)">
                <option v-for="s in SEVERITIES" :key="s" :value="s">{{ s }}</option>
              </select>
              <button type="button" class="profile-remove" :title="`Remove ${code}`" @click="remove(['severity', code])">✕</button>
            </div>
            <div class="profile-row">
              <input v-model="newSeverity.code" class="profile-new-code" list="profile-codes" placeholder="CODE, e.g. JCLS014" spellcheck="false">
              <datalist id="profile-codes">
                <option v-for="code in ALL_CODES" :key="code" :value="code"></option>
              </datalist>
              <select v-model="newSeverity.severity" class="profile-new-severity">
                <option v-for="s in SEVERITIES" :key="s" :value="s">{{ s }}</option>
              </select>
              <button type="button" class="profile-add profile-add-severity" @click="addSeverity">ADD</button>
            </div>
          </fieldset>
        </form>
      </template>

      <template v-else>
        <p class="profile-help">
          The same profile as JSON: <code>names</code> (patterns for job, step and dd
          names, with * and %), <code>allowed</code> values for keywords,
          <code>dsnPrefixes</code> for new datasets, <code>extraKeywords</code> for JOB,
          EXEC and DD, and <code>severity</code> (error, warning, info or off) for each code.
        </p>
        <textarea
            class="profile-text"
            aria-label="Site profile (JSON)"
            spellcheck="false"
            :value="modelValue"
            :placeholder="EXAMPLE"
            @input="$emit('update', $event.target.value)"
        ></textarea>
      </template>
      <p v-if="problem && (view === 'json' || !jsonProblem)" class="profile-problem" role="status">{{ problem }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { CODE_GROUPS } from '../diagnosticCodes';

const props = defineProps({
  modelValue: { type: String, default: '' },
  // Why the API refused the profile, if it did.
  rejected: { type: String, default: '' }
});
const emit = defineEmits(['update']);

const NAME_KINDS = [{ key: 'job', label: 'Jobs' }, { key: 'step', label: 'Steps' }, { key: 'dd', label: 'DDs' }];
const STATEMENTS = ['JOB', 'EXEC', 'DD'];
const SEVERITIES = ['error', 'warning', 'info', 'off'];
const ALL_CODES = CODE_GROUPS.flatMap(g => Object.keys(g.codes));
const view = ref('form');
const newAllowed = ref({ keyword: '', values: '' });
const newSeverity = ref({ code: '', severity: 'off' });

const EXAMPLE = JSON.stringify({
  names: { job: ['AR*'] },
  allowed: { CLASS: ['A', 'B'] },
  dsnPrefixes: ['AR'],
  extraKeywords: { EXEC: ['LOCALKW'] },
  severity: { JCLS014: 'off' }
}, null, 2);

const jsonProblem = computed(() => {
  if (!props.modelValue.trim()) {
    return '';
  }

  try {
    const value = JSON.parse(props.modelValue);
    return value && typeof value === 'object' && !Array.isArray(value) ? '' : 'The profile must be a JSON object.';
  } catch (e) {
    return `Not valid JSON, so it isn't used: ${e.message}`;
  }
});

const problem = computed(() => jsonProblem.value || props.rejected);

// The profile the form shows: the JSON's object, or an empty one.
const profile = computed(() => {
  try {
    const value = JSON.parse(props.modelValue || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
});

const listText = value => (Array.isArray(value) ? value.join(', ') : value || '');
const toList = text => text.split(',').map(v => v.trim()).filter(Boolean);
const isEmpty = value => value === undefined || (Array.isArray(value) ? !value.length : typeof value === 'object' && !Object.keys(value).length);

// Writes a changed copy of the profile back as JSON, dropping empty parts so
// the JSON stays as small as the form.
function write(change) {
  const next = JSON.parse(JSON.stringify(profile.value));
  change(next);
  for (const [key, value] of Object.entries(next)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [inner, v] of Object.entries(value)) {
        if (isEmpty(v)) {
          delete value[inner];
        }
      }
    }

    if (isEmpty(next[key])) {
      delete next[key];
    }
  }

  emit('update', Object.keys(next).length ? JSON.stringify(next, null, 2) : '');
}

function set(path, value) {
  write(p => {
    let node = p;
    for (const key of path.slice(0, -1)) {
      node = node[key] = node[key] && typeof node[key] === 'object' ? node[key] : {};
    }

    node[path[path.length - 1]] = value;
  });
}

function setList(path, text) {
  set(path, toList(text));
}

function remove(path) {
  write(p => {
    delete p[path[0]][path[1]];
  });
}

function addAllowed() {
  const keyword = newAllowed.value.keyword.trim().toUpperCase();
  if (keyword && toList(newAllowed.value.values).length) {
    setList(['allowed', keyword], newAllowed.value.values);
    newAllowed.value = { keyword: '', values: '' };
  }
}

function addSeverity() {
  const code = newSeverity.value.code.trim().toUpperCase();
  if (ALL_CODES.includes(code)) {
    set(['severity', code], newSeverity.value.severity);
    newSeverity.value = { code: '', severity: 'off' };
  }
}

const status = computed(() => (!props.modelValue.trim() ? 'NONE' : problem.value ? 'NOT USED' : 'IN USE'));
</script>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-inset);
  border: 1px solid var(--grid-line);
  border-radius: var(--radius);
  overflow: hidden;
}

.profile-topline {
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

.profile-topline__label {
  color: var(--field-turquoise);
  font-weight: 600;
}

.profile-topline__meta {
  flex: 1;
}

.profile-example {
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

.profile-example:hover {
  color: var(--text-bright);
  border-color: var(--text-dim);
}

.profile-views {
  display: flex;
  gap: 10px;
}

.profile-view {
  padding: 0;
  background: none;
  border: 0;
  font: inherit;
  letter-spacing: inherit;
  color: var(--text-dim);
  cursor: pointer;
}

.profile-view[aria-selected="true"] {
  color: var(--text-bright);
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-form fieldset {
  margin: 0;
  padding: 8px 10px;
  border: 1px solid var(--grid-line);
  border-radius: var(--radius);
}

.profile-form legend {
  padding: 0 4px;
  font-family: var(--font-cond);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--field-turquoise);
}

.profile-hint {
  color: var(--text-faint);
  letter-spacing: 0;
}

.profile-form label,
.profile-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.profile-form label span {
  width: 4em;
  color: var(--text-dim);
  font-size: 12px;
}

.profile-form input,
.profile-form select {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text-primary);
  background: var(--surface);
  border: 1px solid var(--grid-line);
  border-radius: var(--radius);
  padding: 3px 6px;
}

.profile-row code {
  width: 8em;
  font-family: var(--font-mono);
  color: var(--text-bright);
}

.profile-add,
.profile-remove {
  font-family: var(--font-cond);
  font-size: 11px;
  color: var(--text-dim);
  background: transparent;
  border: 1px solid var(--grid-line-strong);
  border-radius: var(--radius);
  padding: 2px 8px;
  cursor: pointer;
}

.profile-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  overflow-y: auto;
}

.profile-help {
  margin: 0;
  color: var(--text-dim);
  font-size: 12.5px;
  line-height: 1.5;
}

.profile-text {
  flex: 1;
  min-height: 140px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text-primary);
  background: var(--surface);
  border: 1px solid var(--grid-line);
  border-radius: var(--radius);
  padding: 8px;
  resize: none;
}

.profile-problem {
  margin: 0;
  color: var(--warning);
  font-family: var(--font-mono);
  font-size: 12px;
}
</style>
