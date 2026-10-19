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
          <li><strong>IF conditions</strong> — RC, ABEND, ABENDCC and RUN tests, operators and brackets, THEN, and that
            each step named in a condition comes earlier in the job.
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
          <li><strong>JES2 statements</strong> — <code>/*ROUTE</code>, <code>/*JOBPARM</code> and the other JES2
            control statements: known names, the ROUTE operand, and placement around the JOB statement.
          </li>
          <li><strong>JES3 statements</strong> — when JES3 is chosen (z/OS 2.5 or earlier): <code>//*MAIN</code>,
            <code>//*FORMAT</code> and the other JES3 statements, their keywords and placement.
          </li>
        </ul>

        <h3>Keys</h3>
        <table>
          <tbody>
            <tr><td>F1 · Alt+H</td><td>Open this help (Escape or F1 closes it)</td></tr>
            <tr><td>F5 · Ctrl/⌘+Enter</td><td>Check the JCL now</td></tr>
            <tr><td>F6 · Alt+L</td><td>Share the job as a link (nothing is stored on a server)</td></tr>
            <tr><td>F9 · Alt+S</td><td>Load the next sample</td></tr>
            <tr><td>F12 · Alt+C</td><td>Clear the editor</td></tr>
          </tbody>
        </table>
        <p>
          Some browsers keep F keys for themselves, and Macs need Fn, so each key has a fallback.
          If F9 or F12 replaces text you typed, an Undo button brings it back for a few seconds.
        </p>

        <h3>Library</h3>
        <p>
          Open <strong>LIBRARY</strong> at the top to paste the catalogued procedures and INCLUDE
          members your job uses, each with the library it lives in. They are found in the order of
          the job's JCLLIB, then members with no library, and checked along with the job. A problem
          inside a member is shown with the member's name, such as <code>MYPROC2 L3:5</code>; click
          it to jump there.
        </p>

        <h3>Columns</h3>
        <p>
          Each line is read like an 80-column card, as z/OS reads it. Columns 1–71 hold the
          statement. A non-blank column 72 continues the comment onto the next line, which
          starts with <code>//</code> and a blank in column 3. Columns 73–80 are sequence
          numbers and are ignored. In-stream data lines are kept whole.
        </p>

        <h3>z/OS level and JES</h3>
        <p>
          Choose the z/OS release at the top of the workbench: z/OS 2.3, 2.4, 2.5, 3.1 or 3.2.
          The default is <strong>z/OS 3.2</strong>, and JES2. JES3 can only be chosen at z/OS 2.5
          and earlier, because IBM removed it in z/OS 3.1. A keyword your release doesn't have gets
          <code>JCLK005</code>.
        </p>

        <h3>Diagnostic codes</h3>
        <div v-for="group in CODE_GROUPS" :key="group.prefix" class="help-codes">
          <h4>{{ group.prefix }} — {{ group.name }}</h4>
          <table>
            <tbody>
              <tr v-for="(text, code) in group.codes" :key="code">
                <td>{{ code }}</td>
                <td>{{ text }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Privacy</h3>
        <p>
          Your JCL is sent to the JCLcheck API to be checked, and is never stored or
          counted there. Your draft and library stay in your own browser, and a shared
          link carries the JCL inside the link itself, after the #, which never reaches a
          server. The site counts anonymous usage with GoatCounter, with no cookies
          and no personal data: pages visited, where visits come from, browser, device
          size and country, which features are used, and which error codes appear. If
          your browser sends Do Not Track or Global Privacy Control, nothing is counted
          at all.
        </p>

        <h3>Limitations</h3>
        <p>
          This tool validates syntax and structure only. It cannot see datasets on
          an actual system, or catalogued procedures you haven't added to the
          Library, so a call to an unresolved PROC is flagged as a warning (it may be
          a valid catalogued procedure this tool simply can't see), not a hard error.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { CODE_GROUPS } from '../diagnosticCodes';

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
