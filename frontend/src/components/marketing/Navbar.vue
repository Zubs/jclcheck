<template>
  <header class="nav">
    <div class="nav-inner">
      <router-link to="/" class="nav-brand">
        <span class="nav-brand__mark">//</span>
        <span class="nav-brand__word">JCL<em>check</em></span>
      </router-link>

      <nav class="nav-links">
        <router-link to="/" class="nav-link" exact-active-class="is-active">Product</router-link>
        <router-link to="/about" class="nav-link" exact-active-class="is-active">About</router-link>
        <a class="nav-link" href="https://github.com/Zubs" target="_blank" rel="noopener">GitHub</a>
      </nav>

      <router-link to="/app" class="nav-cta">Launch Workbench →</router-link>
    </div>
  </header>
</template>

<script setup>
</script>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(245, 248, 245, 0.86);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--grid-line);
}
.nav-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 32px;
}
.nav-brand {
  display: flex;
  align-items: baseline;
  gap: 6px;
  text-decoration: none;
  margin-right: auto;
}
.nav-brand__mark {
  font-family: var(--font-mono);
  color: var(--brand);
  font-weight: 700;
  font-size: 18px;
}
.nav-brand__word {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 19px;
  color: var(--text-bright);
}
.nav-brand__word em {
  font-style: normal;
  color: var(--brand);
}

.nav-links {
  display: flex;
  gap: 24px;
}
.nav-link {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 14.5px;
  color: var(--text-dim);
  text-decoration: none;
  padding: 6px 2px;
  border-bottom: 2px solid transparent;
  transition: color 0.15s ease;
}
.nav-link:hover { color: var(--text-bright); }
.nav-link.is-active { color: var(--text-bright); border-bottom-color: var(--brand); }

.nav-cta {
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 14px;
  color: #fff;
  background: var(--accent);
  padding: 9px 16px;
  border-radius: 999px;
  text-decoration: none;
  box-shadow: var(--shadow-sm);
  white-space: nowrap;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}
.nav-cta:hover {
  background: var(--accent-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

@media (max-width: 720px) {
  .nav-links { display: none; }
  .nav-inner { gap: 12px; }
}
</style>
