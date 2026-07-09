<template>
  <div class="preview">
    <div class="preview-bar">
      <span class="dot" style="background:#ff6b6b"></span>
      <span class="dot" style="background:#f0c64d"></span>
      <span class="dot" style="background:#7fe89a"></span>
      <span class="preview-bar__title">payroll.jcl — JCLCHECK</span>
    </div>
    <div class="preview-body">
      <pre class="code"><span class="ln">01</span><span class="tok-stmt">//STEP010</span> <span
          class="tok-op">EXEC</span> <span class="tok-kw">PGM</span>=IEFBR14
<span class="ln">02</span><span class="tok-stmt">//DD1</span>     <span class="tok-op">DD</span>   <span class="tok-kw">DSN</span>=PROD.PAY.INPUT,<span
            class="tok-kw">DISP</span>=SHR
<span class="ln">03</span><span class="tok-stmt">//DD1</span>     <span class="tok-op">DD</span>   <span class="tok-kw">DSN</span>=PROD.PAY.OUT,<span
            class="tok-kw">DISP</span>=(NEW,CATLG)  <span class="err-underline">DD1</span></pre>

      <div class="callout">
        <div class="callout-head">
          <span class="callout-badge">ERR</span>
          <span class="callout-loc">L3:3</span>
          <span class="callout-code">JCLD001</span>
        </div>
        <div class="callout-msg">Duplicate DD name 'DD1' in step 'STEP010'.</div>
        <div class="callout-fix"><span>FIX ›</span> Rename this DD statement, or omit the name to concatenate.</div>
      </div>

      <div class="preview-footline">
        <span class="ok-dot"></span> 8 checks passed · 1 error found
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview {
  background: #0d1210;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 30px 60px rgba(10, 30, 18, 0.35), 0 4px 14px rgba(10, 30, 18, 0.2);
  border: 1px solid #1e2a1c;
}

.preview-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #0a0e0b;
  border-bottom: 1px solid #1e2a1c;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  opacity: 0.85;
}

.preview-bar__title {
  margin-left: 10px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11.5px;
  color: #4c7a58;
  letter-spacing: 0.02em;
}

.preview-body {
  padding: 18px 18px 16px;
}

.code {
  margin: 0 0 14px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12.5px;
  line-height: 1.9;
  color: #7fe89a;
  white-space: pre;
  overflow-x: auto;
}

.ln {
  color: #34503c;
  margin-right: 10px;
}

.tok-stmt {
  color: #b8ffce;
}

.tok-op {
  color: #4fd8d0;
}

.tok-kw {
  color: #6fa8e8;
}

.err-underline {
  color: #ff6b6b;
  text-decoration: underline wavy #ff6b6b;
  text-underline-offset: 3px;
  margin-left: 6px;
  font-size: 11px;
}

.callout {
  background: #131a13;
  border: 1px solid #26331f;
  border-left: 3px solid #ff6b6b;
  border-radius: 6px;
  padding: 10px 12px;
  font-family: 'IBM Plex Mono', monospace;
}

.callout-head {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  margin-bottom: 5px;
}

.callout-badge {
  color: #ff6b6b;
  font-weight: 700;
}

.callout-loc {
  color: #4c7a58;
}

.callout-code {
  color: #34503c;
  margin-left: auto;
}

.callout-msg {
  color: #b8ffce;
  font-size: 12px;
  line-height: 1.5;
}

.callout-fix {
  margin-top: 5px;
  color: #4c7a58;
  font-size: 11.5px;
  line-height: 1.5;
}

.callout-fix span {
  color: #4fd8d0;
  font-weight: 600;
}

.preview-footline {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #4c7a58;
}

.ok-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7fe89a;
  box-shadow: 0 0 6px #7fe89a;
}
</style>
