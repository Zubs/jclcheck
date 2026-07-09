// parser.js
// Consumes the logical statements produced by lexer.js and builds an AST
// (see ast.js), while emitting structural/ordering diagnostics.
//
// Scope note: conditional (IF/THEN/ELSE/ENDIF) blocks are tracked for
// balancing/nesting validation, but statements inside them are still added
// to the enclosing step/job structure - this tool validates JCL syntax and
// structure, not runtime conditional expansion (which requires an actual
// mainframe symbol table).

const { JobNode, StepNode, DDNode, ProcNode, IfNode, IncludeNode, SetNode } = require('./ast');
const { tokenizeParams } = require('./paramTokenizer');
const { makeDiagnostic } = require('./errors');
const { STATEMENT_TYPES } = require('./keywords');

const PASSTHROUGH_OPS = new Set(['JCLLIB', 'OUTPUT', 'XMIT', 'NOTIFY']);

function attachParams(node, stmt, diagnostics) {
  const { params, errors } = tokenizeParams(stmt.operand, stmt.operandCol);
  node.params = params;
  for (const e of errors) {
    diagnostics.push(makeDiagnostic(e.code, {}, { line: stmt.endLine, column: e.column, source: 'parser' }));
  }
  return params;
}

function parse(statements) {
  const diagnostics = [];
  let job = null;
  const procs = [];

  let procStack = null; // currently-open in-stream PROC
  let container = { steps: [] }; // root container before JOB or when JOB missing
  let currentStep = null;
  const ifStack = [];
  let sawAnyStatement = false;

  for (const stmt of statements) {
    if (stmt.type !== 'STMT') continue;
    sawAnyStatement = true;
    const op = (stmt.op || '').toUpperCase();

    if (!op) {
      diagnostics.push(makeDiagnostic('JCLP001', {}, { line: stmt.line, column: stmt.opCol || stmt.nameCol, source: 'parser' }));
      continue;
    }

    if (!STATEMENT_TYPES.has(op) && !PASSTHROUGH_OPS.has(op)) {
      diagnostics.push(makeDiagnostic('JCLP002', { found: op, hint: `Unknown operation '${op}'.` }, { line: stmt.line, column: stmt.opCol, source: 'parser' }));
      continue;
    }

    switch (op) {
      case 'JOB': {
        if (job) {
          diagnostics.push(makeDiagnostic('JCLO004', {}, { line: stmt.line, column: stmt.opCol }));
          break;
        }
        job = JobNode(stmt.name, stmt.line);
        attachParams(job, stmt, diagnostics);
        container = job;
        currentStep = null;
        break;
      }
      case 'PROC': {
        const proc = ProcNode(stmt.name || `(unnamed@${stmt.line})`, stmt.line);
        attachParams(proc, stmt, diagnostics);
        procs.push(proc);
        procStack = proc;
        container = proc;
        currentStep = null;
        break;
      }
      case 'PEND': {
        if (!procStack) {
          diagnostics.push(makeDiagnostic('JCLP008', {}, { line: stmt.line, column: stmt.opCol }));
          break;
        }
        procStack.endLine = stmt.line;
        procStack = null;
        container = job || { steps: [] };
        currentStep = null;
        break;
      }
      case 'EXEC': {
        if (!job && !procStack) {
          diagnostics.push(makeDiagnostic('JCLO002', { name: stmt.name || '(unnamed)' }, { line: stmt.line, column: stmt.opCol }));
        }
        const step = StepNode(stmt.name, 'EXEC', stmt.line);
        const params = attachParams(step, stmt, diagnostics);
        const pgmParam = params.find(p => p.kind === 'keyword' && p.key === 'PGM');
        const procParam = params.find(p => p.kind === 'keyword' && p.key === 'PROC');
        const positional = params.find(p => p.kind === 'positional');
        if (pgmParam) step.pgm = pgmParam.value;
        if (procParam) step.calledProc = procParam.value;
        else if (!pgmParam && positional) step.calledProc = positional.value;
        container.steps.push(step);
        currentStep = step;
        break;
      }
      case 'DD': {
        if (!currentStep) {
          diagnostics.push(makeDiagnostic('JCLO003', { name: stmt.name || '(unnamed)' }, { line: stmt.line, column: stmt.opCol }));
          break;
        }
        const dd = DDNode(stmt.name, stmt.line);
        attachParams(dd, stmt, diagnostics);
        if (stmt.instreamData) dd.instreamData = stmt.instreamData;
        currentStep.dds.push(dd);
        break;
      }
      case 'IF': {
        const node = IfNode(stmt.operand, stmt.line);
        ifStack.push(node);
        break;
      }
      case 'THEN':
        // Often combined with IF on the same operand text (IF ... THEN);
        // treat as a no-op continuation marker.
        break;
      case 'ELSE': {
        if (ifStack.length === 0) {
          diagnostics.push(makeDiagnostic('JCLP007', {}, { line: stmt.line, column: stmt.opCol }));
        }
        break;
      }
      case 'ENDIF': {
        if (ifStack.length === 0) {
          diagnostics.push(makeDiagnostic('JCLP006', {}, { line: stmt.line, column: stmt.opCol }));
        } else {
          const node = ifStack.pop();
          node.endLine = stmt.line;
        }
        break;
      }
      case 'SET': {
        const { params } = tokenizeParams(stmt.operand, stmt.operandCol);
        break;
      }
      case 'INCLUDE': {
        break;
      }
      default:
        break; // passthrough ops (JCLLIB, OUTPUT, XMIT, NOTIFY)
    }
  }

  if (!job && sawAnyStatement) {
    diagnostics.push(makeDiagnostic('JCLO001', {}, { line: statements.find(s => s.type === 'STMT')?.line || 1, column: 1 }));
  }

  for (const node of ifStack) {
    diagnostics.push(makeDiagnostic('JCLP005', {}, { line: node.line, column: 1 }));
  }
  if (procStack) {
    diagnostics.push(makeDiagnostic('JCLP009', {}, { line: procStack.line, column: 1 }));
  }

  return { job, procs, diagnostics };
}

module.exports = { parse };
