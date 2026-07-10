<template>
  <div class="page">
    <Navbar/>

    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="eyebrow">Free JCL check, online — no mainframe needed</span>
          <h1>Learn mainframe JCL<br/>without a mainframe.</h1>
          <p class="lede">
            JCLcheck parses your Job Control Language the way z/OS would — statement
            order, DD rules, keyword syntax, PROC symbolics — and explains every
            problem in plain English, with a fix. No CICS, no TSO, no green screen
            required to get started.
          </p>
          <div class="hero-actions">
            <router-link to="/app" class="btn btn-primary">Launch the workbench →</router-link>
            <router-link to="/about" class="btn btn-ghost">Why I built this</router-link>
          </div>
          <div class="hero-trust">
            <span>Built on the IBM JCL Reference</span>
            <span class="sep">·</span>
            <span>Runs entirely in your browser + a Node API</span>
          </div>
        </div>
        <div class="hero-visual">
          <CodePreview/>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <span class="eyebrow">What it checks</span>
        <h2>Everything a mainframe would tell you — before you ever submit the job.</h2>
      </div>
      <div class="feature-grid">
        <FeatureCard title="Structure & ordering" glyph="1">
          JOB, EXEC and DD statement order, matching IF/ENDIF and PROC/PEND blocks,
          continuation lines, and parenthesis balance.
        </FeatureCard>
        <FeatureCard title="DD statement rules" glyph="2">
          Catches duplicate DD names within a step and DD statements with a
          missing or conflicting data source.
        </FeatureCard>
        <FeatureCard title="Keyword validation" glyph="3">
          Every JOB/EXEC/DD keyword is checked against the IBM reference, with
          "did you mean…" suggestions for typos like <code>REGON</code>.
        </FeatureCard>
        <FeatureCard title="Parameter syntax" glyph="4">
          DISP, SPACE, DCB (RECFM/DSORG/LRECL/BLKSIZE), REGION, TIME and DSN
          qualifier rules, all validated in detail.
        </FeatureCard>
        <FeatureCard title="PROCs & symbolics" glyph="5">
          Resolves in-stream PROC calls, checks <code>&amp;SYMBOLIC</code> parameters
          against PROC defaults, and matches DD overrides to the procedure.
        </FeatureCard>
        <FeatureCard title="Plain-English fixes" glyph="6">
          Every error carries a code, a message a human wrote, and a concrete
          suggestion — built for people still learning the syntax.
        </FeatureCard>
      </div>
    </section>

    <section class="section section-how">
      <div class="section-head">
        <span class="eyebrow">How it works</span>
        <h2>A real compiler pipeline, not a pile of regexes.</h2>
      </div>
      <div class="steps">
        <div class="step">
          <span class="step-num">01</span>
          <h3>Lex</h3>
          <p>Raw JCL text becomes logical statements — continuations joined,
            comments and in-stream data separated out.</p>
        </div>
        <div class="step">
          <span class="step-num">02</span>
          <h3>Parse</h3>
          <p>Statements become an AST — jobs, steps, DDs and procedures — while
            structural rules are checked in real time.</p>
        </div>
        <div class="step">
          <span class="step-num">03</span>
          <h3>Validate</h3>
          <p>A rule engine walks the AST checking keywords, values, duplicates
            and PROC references against the IBM JCL Reference.</p>
        </div>
        <div class="step">
          <span class="step-num">04</span>
          <h3>Explain</h3>
          <p>Every finding is translated into a message and a fix — line,
            column, and all — so you learn as you go.</p>
        </div>
      </div>
    </section>

    <section class="section faq">
      <div class="section-head">
        <span class="eyebrow">FAQ</span>
        <h2>Questions people ask before their first JCL check online</h2>
      </div>
      <div class="faq-list">
        <details v-for="(item, i) in faq" :key="i" class="faq-item">
          <summary>{{ item.q }}</summary>
          <p>{{ item.a }}</p>
        </details>
      </div>
    </section>

    <section class="cta">
      <div class="cta-inner">
        <h2>Paste some JCL. See what breaks. Learn why.</h2>
        <router-link to="/app" class="btn btn-primary btn-lg">Open the workbench →</router-link>
      </div>
    </section>

    <Footer/>
  </div>
</template>

<script setup>
import Navbar from '../components/marketing/Navbar.vue';
import Footer from '../components/marketing/Footer.vue';
import FeatureCard from '../components/marketing/FeatureCard.vue';
import CodePreview from '../components/marketing/CodePreview.vue';
import { LANDING_FAQ } from '../faq';

const faq = LANDING_FAQ;
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

.hero {
  padding: 72px 24px 40px;
}

.hero-inner {
  max-width: 1120px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 56px;
  align-items: center;
}

.hero-copy h1 {
  font-family: var(--font-display);
  font-size: 46px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--text-bright);
  margin: 0 0 20px;
  letter-spacing: -0.01em;
}

.lede {
  font-size: 16.5px;
  line-height: 1.65;
  color: var(--text-dim);
  max-width: 46ch;
  margin: 0 0 28px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 15px;
  padding: 13px 22px;
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

.hero-trust {
  font-family: var(--font-cond);
  font-size: 12px;
  letter-spacing: 0.03em;
  color: var(--text-faint);
}

.hero-trust .sep {
  margin: 0 8px;
}

.hero-visual {
  position: relative;
}

.section {
  max-width: 1120px;
  margin: 0 auto;
  padding: 64px 24px 8px;
}

.section-head {
  max-width: 640px;
  margin-bottom: 36px;
}

.section-head h2 {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 700;
  color: var(--text-bright);
  margin: 0;
  line-height: 1.25;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.feature-grid code {
  font-family: var(--font-mono);
  background: var(--surface-inset);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.92em;
}

.section-how {
  padding-top: 30px;
}

.steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.step {
  border-top: 2px solid var(--grid-line-strong);
  padding-top: 14px;
}

.step-num {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--brand);
  font-weight: 700;
}

.step h3 {
  font-family: var(--font-display);
  font-size: 17px;
  margin: 8px 0 6px;
  color: var(--text-bright);
}

.step p {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--text-dim);
  margin: 0;
}

.cta {
  margin-top: 72px;
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
  font-size: 28px;
  color: var(--text-bright);
  margin: 0 0 24px;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 760px;
}

.faq-item {
  background: var(--surface);
  border: 1px solid var(--grid-line);
  border-radius: var(--radius);
  padding: 6px 18px;
  box-shadow: var(--shadow-sm);
}

.faq-item summary {
  cursor: pointer;
  list-style: none;
  padding: 14px 0;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 15px;
  color: var(--text-bright);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.faq-item summary::-webkit-details-marker {
  display: none;
}

.faq-item summary::after {
  content: '+';
  font-family: var(--font-mono);
  font-size: 18px;
  color: var(--brand);
  margin-left: 12px;
}

.faq-item[open] summary::after {
  content: '−';
}

.faq-item p {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-dim);
}

@media (max-width: 900px) {
  .hero-inner {
    grid-template-columns: 1fr;
  }

  .feature-grid {
    grid-template-columns: 1fr 1fr;
  }

  .steps {
    grid-template-columns: 1fr 1fr;
  }

  .hero-copy h1 {
    font-size: 34px;
  }
}

@media (max-width: 560px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }

  .steps {
    grid-template-columns: 1fr;
  }
}
</style>
