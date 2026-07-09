<template>
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="footer-brand__word"><span class="footer-brand__mark">//</span> JCLcheck</div>
        <p>A JCL validation workbench for learning, without a mainframe.</p>
      </div>
      <div class="footer-links">
        <div class="footer-col">
          <span class="footer-col__title">Product</span>
          <router-link to="/app">Workbench</router-link>
          <router-link to="/">Features</router-link>
        </div>
        <div class="footer-col">
          <span class="footer-col__title">Project</span>
          <router-link to="/about">About</router-link>
          <a href="https://github.com/Zubs" target="_blank" rel="noopener">GitHub</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>Built by <a href="https://zubs.github.io" target="_blank" rel="noopener">Zubair</a></span>
      <span>No mainframe required.</span>
    </div>
  </footer>
</template>

<script setup>
</script>

<style scoped>
.footer {
  border-top: 1px solid var(--grid-line);
  background: var(--surface);
  margin-top: 80px;
}
.footer-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 48px 24px 32px;
  display: flex;
  justify-content: space-between;
  gap: 32px;
  flex-wrap: wrap;
}
.footer-brand__word {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--text-bright);
}
.footer-brand__mark { color: var(--brand); font-family: var(--font-mono); }
.footer-brand p {
  margin: 8px 0 0;
  color: var(--text-dim);
  font-size: 13.5px;
  max-width: 280px;
  line-height: 1.5;
}
.footer-links {
  display: flex;
  gap: 56px;
}
.footer-col {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.footer-col__title {
  font-family: var(--font-cond);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--text-faint);
  margin-bottom: 3px;
}
.footer-col a {
  font-size: 13.5px;
  color: var(--text-dim);
  text-decoration: none;
}
.footer-col a:hover { color: var(--brand-dark); }

.footer-bottom {
  max-width: 1120px;
  margin: 0 auto;
  padding: 16px 24px 28px;
  display: flex;
  justify-content: space-between;
  font-family: var(--font-cond);
  font-size: 11.5px;
  letter-spacing: 0.04em;
  color: var(--text-faint);
  border-top: 1px solid var(--grid-line);
}
.footer-bottom a { color: var(--text-dim); text-decoration: underline; }
</style>
