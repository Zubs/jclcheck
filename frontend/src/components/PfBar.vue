<template>
  <div class="pfbar">
    <button
      v-for="k in keys"
      :key="k.key"
      class="pfkey"
      :class="{ 'is-primary': k.primary, 'is-disabled': k.disabled }"
      :disabled="k.disabled"
      @click="$emit(k.event)"
    >
      <span class="pfkey__f">{{ k.key }}</span>
      <span class="pfkey__label">{{ k.label }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  keys: { type: Array, required: true }
});
defineEmits(['validate', 'sample', 'clear', 'help', 'download']);
</script>

<style scoped>
.pfbar {
  display: flex;
  gap: 1px;
  background: var(--grid-line);
  border: 1px solid var(--grid-line);
  border-radius: var(--radius);
  overflow: hidden;
}
.pfkey {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px 7px;
  background: var(--surface);
  border: none;
  color: var(--text-dim);
  font-family: var(--font-cond);
  transition: background 0.12s ease, color 0.12s ease;
}
.pfkey:hover:not(.is-disabled) {
  background: var(--surface-raised);
  color: var(--text-bright);
}
.pfkey.is-primary {
  color: var(--text-bright);
}
.pfkey.is-primary:hover {
  background: rgba(127, 232, 154, 0.12);
}
.pfkey.is-disabled { opacity: 0.35; cursor: default; }
.pfkey__f {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--field-turquoise);
}
.pfkey.is-disabled .pfkey__f { color: var(--text-faint); }
.pfkey__label {
  font-size: 10.5px;
  letter-spacing: 0.08em;
}
</style>
