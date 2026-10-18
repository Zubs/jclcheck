<template>
  <div class="page">
    <Navbar/>

    <section class="notfound">
      <div class="notfound__inner">
        <span class="eyebrow">404</span>
        <h1>Page not found</h1>
        <p class="lede">
          There's nothing at this address. It may have moved, or the link may have a typo.
        </p>
        <div class="links">
          <router-link to="/" class="btn btn-primary">Back to the home page</router-link>
          <router-link to="/app" class="btn btn-ghost">Open the workbench</router-link>
        </div>
      </div>
    </section>

    <Footer/>
  </div>
</template>

<script setup>
import Navbar from '../components/marketing/Navbar.vue';
import Footer from '../components/marketing/Footer.vue';
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.notfound {
  flex: 1;
  padding: 96px 24px;
}

.notfound__inner {
  max-width: 560px;
  margin: 0 auto;
  text-align: center;
}

.eyebrow {
  display: inline-block;
  font-family: var(--font-cond);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--brand-dark);
  background: var(--brand-light);
  padding: 5px 10px;
  border-radius: 999px;
  margin-bottom: 16px;
}

h1 {
  font-family: var(--font-display);
  font-size: 38px;
  font-weight: 700;
  color: var(--text-bright);
  margin: 0 0 16px;
}

.lede {
  font-size: 16px;
  line-height: 1.65;
  color: var(--text-dim);
  margin: 0 0 26px;
}

.links {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 14.5px;
  padding: 11px 20px;
  border-radius: 999px;
  text-decoration: none;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover {
  background: var(--accent-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-ghost {
  background: transparent;
  color: var(--text-bright);
  border: 1px solid var(--grid-line-strong);
}

.btn-ghost:hover {
  border-color: var(--brand);
  color: var(--brand-dark);
}
</style>
