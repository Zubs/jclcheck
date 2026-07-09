<template>
  <div class="help-backdrop" @click.self="$emit('close')">
    <div class="help">
      <div class="help-topline">
        <span>HELP — JCLCHECK</span>
        <button class="help-close" @click="$emit('close')">✕ F1</button>
      </div>
      <div class="help-body">
        <p>
          JCLcheck parses your Job Control Language and runs it through a validation
          engine modeled on the IBM MVS JCL Reference — no mainframe connection needed.
          It's built for learning JCL and training new mainframe developers, so every
          finding comes with a plain-English explanation and a suggested fix.
        </p>

        <h3>What gets checked</h3>
        <ul>
          <li><strong>Structure</strong> — statement ordering (JOB → EXEC → DD), matching IF/ENDIF and PROC/PEND blocks,
            continuation lines, parenthesis balance.
          </li>
          <li><strong>DD statements</strong> — duplicate ddnames within a step, missing or conflicting data sources (DSN
            vs DUMMY vs SYSOUT vs instream data).
          </li>
          <li><strong>Keywords</strong> — unrecognized parameters for JOB/EXEC/DD, with "did you mean…" suggestions.
          </li>
          <li><strong>Parameter syntax</strong> — DISP, SPACE, DCB (RECFM/DSORG/LRECL/BLKSIZE), REGION, TIME, and DSN
            qualifier rules.
          </li>
          <li><strong>Procedures</strong> — in-stream PROC/PEND resolution, symbolic parameters (&amp;SYM), and
            DD-override matching.
          </li>
        </ul>

        <h3>Error codes</h3>
        <table>
          <tr>
            <td>JCLLxxx</td>
            <td>Lexer — raw line/record issues</td>
          </tr>
          <tr>
            <td>JCLPxxx</td>
            <td>Parser — statement structure</td>
          </tr>
          <tr>
            <td>JCLOxxx</td>
            <td>Ordering — JOB/EXEC/DD sequence</td>
          </tr>
          <tr>
            <td>JCLDxxx</td>
            <td>DD statement rules</td>
          </tr>
          <tr>
            <td>JCLKxxx</td>
            <td>Keyword / required parameter rules</td>
          </tr>
          <tr>
            <td>JCLSxxx</td>
            <td>Parameter value syntax</td>
          </tr>
          <tr>
            <td>JCLNxxx</td>
            <td>Name field syntax</td>
          </tr>
          <tr>
            <td>JCLRxxx</td>
            <td>PROC resolution / symbolics</td>
          </tr>
        </table>

        <h3>Limitations</h3>
        <p>
          This tool validates syntax and structure only. It cannot see cataloged
          procedures or datasets on an actual system, so a call to an unresolved
          PROC is flagged as a warning (it may be a valid cataloged procedure this
          tool simply can't see), not a hard error.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['close']);
</script>

<style scoped>
.help-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.help {
  width: min(640px, 100%);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-inset);
  border: 1px solid var(--grid-line-strong);
  border-radius: var(--radius);
  box-shadow: 0 0 40px rgba(127, 232, 154, 0.08);
}

.help-topline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--grid-line);
  font-family: var(--font-cond);
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--field-turquoise);
  font-weight: 600;
}

.help-close {
  background: none;
  border: 1px solid var(--grid-line-strong);
  color: var(--text-dim);
  font-family: var(--font-cond);
  font-size: 11px;
  padding: 4px 8px;
  border-radius: var(--radius);
}

.help-close:hover {
  color: var(--text-bright);
  border-color: var(--text-dim);
}

.help-body {
  padding: 18px 20px 22px;
  overflow-y: auto;
  color: var(--text-primary);
  font-size: 13.5px;
  line-height: 1.6;
}

.help-body h3 {
  font-family: var(--font-cond);
  color: var(--field-turquoise);
  font-size: 13px;
  letter-spacing: 0.08em;
  margin: 20px 0 8px;
}

.help-body p {
  margin: 0 0 10px;
  color: var(--text-primary);
}

.help-body ul {
  margin: 0;
  padding-left: 18px;
}

.help-body li {
  margin-bottom: 6px;
}

.help-body strong {
  color: var(--text-bright);
}

.help-body table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 12px;
}

.help-body td {
  padding: 4px 8px 4px 0;
  border-bottom: 1px solid var(--grid-line);
  color: var(--text-dim);
}

.help-body td:first-child {
  color: var(--field-blue);
  white-space: nowrap;
}
</style>
