<template>
  <div class="profile">
    <div class="profile-topline">
      <span class="profile-topline__label">SITE PROFILE</span>
      <span class="profile-topline__meta">{{ status }}</span>
      <button class="profile-example" @click="$emit('update', EXAMPLE)">EXAMPLE</button>
    </div>
    <div class="profile-body">
      <p class="profile-help">
        Your shop's rules, as JSON: <code>names</code> (patterns for job, step and dd
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
      <p v-if="problem" class="profile-problem" role="status">{{ problem }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  // Why the API refused the profile, if it did.
  rejected: { type: String, default: '' }
});
defineEmits(['update']);

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
