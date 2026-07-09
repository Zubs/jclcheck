<template>
  <div class="feature">
    <div class="feature-icon" :style="{ background: iconBg, color: iconColor }">
      <slot name="icon">{{ glyph }}</slot>
    </div>
    <h3 class="feature-title">{{ title }}</h3>
    <p class="feature-desc">
      <slot/>
    </p>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  glyph: { type: String, default: '//' },
  iconBg: { type: String, default: 'var(--brand-light)' },
  iconColor: { type: String, default: 'var(--brand-dark)' }
});
</script>

<style scoped>
.feature {
  background: var(--surface);
  border: 1px solid var(--grid-line);
  border-radius: var(--radius);
  padding: 22px 20px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.feature:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.feature-icon {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 14px;
}

.feature-title {
  font-family: var(--font-display);
  font-size: 16.5px;
  font-weight: 700;
  color: var(--text-bright);
  margin: 0 0 8px;
}

.feature-desc {
  font-size: 13.8px;
  line-height: 1.55;
  color: var(--text-dim);
  margin: 0;
}
</style>
