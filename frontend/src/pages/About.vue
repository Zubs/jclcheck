<template>
  <div class="page">
    <Navbar/>

    <section class="about-hero">
      <div class="about-hero__inner">
        <div class="avatar">ZIA</div>
        <span class="eyebrow">About</span>
        <h1>Hi, I'm Zubair.</h1>
        <p class="lede">
          I'm a full-stack engineer and First Class Computer Science graduate from the
          University of Wolverhampton. I like building tools that take
          something intimidating and make it click — JCLcheck is one of those.
        </p>
        <div class="links">
          <a href="https://zubs.github.io" target="_blank" rel="noopener" class="btn btn-primary">Portfolio ↗</a>
          <a href="https://github.com/Zubs" target="_blank" rel="noopener" class="btn btn-ghost">GitHub — @Zubs ↗</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="prose">
        <h2>Why JCLcheck exists</h2>
        <p>
          JCL has a reputation for being one of those things you only really
          learn by getting yelled at by a mainframe — cryptic abend codes,
          column-sensitive syntax, and errors that assume you already know
          what went wrong. Most students and junior developers don't have a
          z/OS system sitting around to practice on.
        </p>
        <p>
          JCLcheck is my attempt to close that gap: a real lexer, parser and
          rule engine — modeled on the IBM JCL Reference — that runs entirely
          in a browser and a small Node API, and explains every mistake the
          way a patient senior developer would, not the way a mainframe does.
        </p>
      </div>
    </section>

    <section class="cta">
      <div class="cta-inner">
        <h2>Curious what I built? Go break some JCL.</h2>
        <router-link to="/app" class="btn btn-primary btn-lg">Open the workbench →</router-link>
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

.about-hero {
  padding: 72px 24px 20px;
}

.about-hero__inner {
  max-width: 640px;
  margin: 0 auto;
  text-align: center;
}

.avatar {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--brand), var(--field-turquoise));
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 22px;
  box-shadow: var(--shadow-md);
}

.about-hero h1 {
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

.btn-lg {
  padding: 15px 28px;
  font-size: 16px;
}

.section {
  max-width: 860px;
  margin: 0 auto;
  padding: 56px 24px 8px;
}

.prose h2 {
  font-family: var(--font-display);
  font-size: 26px;
  color: var(--text-bright);
  margin: 0 0 16px;
}

.prose p {
  font-size: 15.5px;
  line-height: 1.7;
  color: var(--text-dim);
  margin: 0 0 14px;
}

.section-head {
  margin-bottom: 30px;
}

.section-head h2 {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--text-bright);
  margin: 0;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.project {
  display: block;
  background: var(--surface);
  border: 1px solid var(--grid-line);
  border-radius: var(--radius);
  padding: 18px;
  text-decoration: none;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.project:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.project-tag {
  font-family: var(--font-cond);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--field-turquoise);
  font-weight: 600;
}

.project h3 {
  font-family: var(--font-display);
  font-size: 17px;
  color: var(--text-bright);
  margin: 8px 0 8px;
}

.project p {
  font-size: 13.3px;
  line-height: 1.55;
  color: var(--text-dim);
  margin: 0;
}

.section-tags {
  padding-bottom: 20px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tags span {
  font-family: var(--font-cond);
  font-size: 12.5px;
  letter-spacing: 0.04em;
  color: var(--text-dim);
  background: var(--surface-inset);
  border: 1px solid var(--grid-line);
  padding: 7px 13px;
  border-radius: 999px;
}

.tags-note {
  margin-top: 14px;
  font-size: 13.5px;
  color: var(--text-faint);
}

.cta {
  margin-top: 64px;
  padding: 60px 24px;
  background: var(--brand-light);
}

.cta-inner {
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
}

.cta-inner h2 {
  font-family: var(--font-display);
  font-size: 26px;
  color: var(--text-bright);
  margin: 0 0 24px;
}

@media (max-width: 720px) {
  .project-grid {
    grid-template-columns: 1fr;
  }
}
</style>
