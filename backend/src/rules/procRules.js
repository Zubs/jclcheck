// rules/procRules.js
const { makeDiagnostic } = require('../errors');

function buildProcMap(procs) {
  const map = new Map();
  for (const p of procs) map.set(p.name.toUpperCase(), p);
  return map;
}

/** Resolves EXEC ... PROC=xxx (or positional proc-name) against in-stream PROCs. */
function resolveProcCalls(job, procs, diagnostics) {
  if (!job) return;
  const procMap = buildProcMap(procs);
  for (const step of job.steps) {
    if (step.pgm || !step.calledProc) continue;
    const resolved = procMap.get(step.calledProc.toUpperCase());
    if (!resolved) {
      diagnostics.push(makeDiagnostic('JCLR001', { name: step.calledProc }, {
        line: step.line, column: 1,
        severity: 'warning' // could legitimately be a cataloged procedure we can't see
      }));
    } else {
      step.resolvedProc = resolved;
    }
  }
}

const SYMBOL_RE = /&([A-Za-z$#@][A-Za-z0-9$#@]*)\.?/g;

/** Flags &SYMBOLs referenced inside a PROC body that were never declared as defaults. */
function validateSymbolicParams(procs, diagnostics) {
  for (const proc of procs) {
    const declared = new Set(proc.params.filter(p => p.kind === 'keyword').map(p => p.key));
    for (const step of proc.steps) {
      scanParamsForSymbols(step.params, declared, proc.name, step.line, diagnostics);
      for (const dd of step.dds) {
        scanParamsForSymbols(dd.params, declared, proc.name, dd.line, diagnostics);
      }
    }
  }
}

function scanParamsForSymbols(params, declared, procName, line, diagnostics) {
  for (const p of params) {
    const text = p.kind === 'keyword' ? p.value : p.value;
    if (!text || text.indexOf('&') === -1) continue;
    let m;
    const re = new RegExp(SYMBOL_RE);
    while ((m = re.exec(text)) !== null) {
      const sym = m[1].toUpperCase();
      if (!declared.has(sym)) {
        diagnostics.push(makeDiagnostic('JCLR002', { sym: m[1], proc: procName }, { line, column: p.col }));
      }
    }
  }
}

/** For steps invoking a resolved in-stream PROC, checks that overriding DD names match a DD in the proc. */
function validateDDOverrides(job, diagnostics) {
  if (!job) return;
  for (const step of job.steps) {
    if (!step.resolvedProc || step.dds.length === 0) continue;
    const procStepsByName = new Map();
    for (const ps of step.resolvedProc.steps) {
      procStepsByName.set((ps.name || '').toUpperCase(), ps);
    }
    const allDDNames = new Set();
    for (const ps of step.resolvedProc.steps) {
      for (const d of ps.dds) if (d.name) allDDNames.add(d.name.toUpperCase());
    }

    for (const dd of step.dds) {
      if (!dd.name) continue;
      if (dd.name.includes('.')) {
        const [stepName, ddName] = dd.name.split('.');
        const targetStep = procStepsByName.get(stepName.toUpperCase());
        if (!targetStep) {
          diagnostics.push(makeDiagnostic('JCLR003', { name: dd.name, step: step.resolvedProc.name }, { line: dd.line, column: 1, severity: 'warning' }));
          continue;
        }
        const found = targetStep.dds.some(d => d.name && d.name.toUpperCase() === ddName.toUpperCase());
        if (!found) {
          diagnostics.push(makeDiagnostic('JCLR003', { name: ddName, step: stepName }, { line: dd.line, column: 1, severity: 'warning' }));
        }
      } else if (!allDDNames.has(dd.name.toUpperCase())) {
        diagnostics.push(makeDiagnostic('JCLR003', { name: dd.name, step: step.resolvedProc.name }, { line: dd.line, column: 1, severity: 'warning' }));
      }
    }
  }
}

function runProcRules(job, procs, diagnostics) {
  resolveProcCalls(job, procs, diagnostics);
  validateSymbolicParams(procs, diagnostics);
  validateDDOverrides(job, diagnostics);
}

module.exports = { runProcRules, resolveProcCalls, validateSymbolicParams, validateDDOverrides };
