// Consumes the logical statements produced by lexer.js and builds an AST
// (see ast.js), while emitting structural/ordering diagnostics.
//
// Scope note: conditional (IF/THEN/ELSE/ENDIF) blocks are tracked for
// balancing/nesting validation, but statements inside them are still added
// to the enclosing step/job structure - this tool validates JCL syntax and
// structure, not runtime conditional expansion (which requires an actual
// mainframe symbol table).

const {
    JobNode,
    StepNode,
    DDNode,
    ProcNode,
    IfNode
} = require('./ast');
const { tokenizeParams } = require('./paramTokenizer');
const { makeDiagnostic } = require('./errors');
const { STATEMENT_TYPES } = require('./keywords');
const { availability, DEFAULT_ZOS_LEVEL } = require('./levels');
const { parseCondition, conditionChars } = require('./conditions');
const { statementText } = require('./lexer');

const MAX_IF_DEPTH = 15;
const MAX_NOTIFY = 8;

// The IF condition as written, from after "IF" on its first line and from
// column 3 on continuation lines, keeping each character's line and column.
function ifConditionChars(stmt) {
    const chars = [];
    stmt.raw.forEach((raw, i) => {
        const from = i === 0 ? stmt.opCol - 1 + stmt.op.length : 2;
        if (i > 0) {
            chars.push({ ch: ' ', line: stmt.line + i, col: from + 1 });
        }

        chars.push(...conditionChars(statementText(raw).slice(from), stmt.line + i, from + 1));
    });

    return chars;
}

function attachParams(
    node,
    stmt,
    diagnostics
) {
    const { params, errors } = tokenizeParams(stmt.operand, stmt.operandCol, stmt.pieces);
    node.params = params;
    for (const e of errors) {
        diagnostics.push(makeDiagnostic(
            e.code,
            {},
            {
                line: e.line ?? stmt.line,
                column: e.column,
                source: 'parser'
            }
        ));
    }

    return params;
}

function parse(statements, { zosLevel = DEFAULT_ZOS_LEVEL } = {}) {
    const diagnostics = [];
    const jobs = [];
    let job = null; // the current job
    let ended = false; // a null statement (//) ended the last job
    const procs = [];
    const jobGroups = [];
    let group = null; // the open JOBGROUP
    let set = null; // the open JOBSET in it
    let groupJob = null; // the last GJOB/SJOB, which AFTER/BEFORE/CONCURRENT belong to
    // PROCs written before the first JOB: z/OS rejects them (JCLO011), but they
    // still belong to that job so its calls resolve.
    const preJobProcs = [];
    let procStack = null; // currently-open in-stream PROC
    let container = { steps: [] }; // root container before JOB or when JOB missing
    let currentStep = null;
    const ifStack = [];
    let sawAnyStatement = false;

    for (const stmt of statements) {
        if (stmt.type === 'NULL' && job) {
            job = null;
            ended = true;
            container = { steps: [] };
            currentStep = null;
            continue;
        }

        if (stmt.type !== 'STMT') {
            continue;
        }

        sawAnyStatement = true;
        const op = (stmt.op || '').toUpperCase();

        if (ended && op !== 'JOB') {
            diagnostics.push(makeDiagnostic(
                'JCLO007',
                {},
                { line: stmt.line, column: stmt.opCol || 1 }
            ));

            continue;
        }

        if (!op) {
            diagnostics.push(makeDiagnostic(
                'JCLP001',
                {},
                {
                    line: stmt.line,
                    column: stmt.opCol || stmt.nameCol,
                    source: 'parser'
                }
            ));

            continue;
        }

        if (!STATEMENT_TYPES.has(op)) {
            diagnostics.push(makeDiagnostic(
                'JCLP002',
                { found: op, hint: `Unknown operation '${op}'.` },
                {
                    line: stmt.line,
                    column: stmt.opCol,
                    source: 'parser'
                }
            ));

            continue;
        }

        const missing = availability(STATEMENT_TYPES.get(op), zosLevel);
        if (missing) {
            diagnostics.push(makeDiagnostic(
                'JCLK005',
                {
                    kind: 'statement',
                    name: op,
                    level: zosLevel,
                    ...missing
                },
                { line: stmt.line, column: stmt.opCol }
            ));
        }

        switch (op) {
            case 'JOB': {
                job = JobNode(stmt.name, stmt.line);
                if (jobs.length === 0) {
                    job.procs.push(...preJobProcs);
                }

                jobs.push(job);
                ended = false;
                attachParams(
                    job,
                    stmt,
                    diagnostics
                );

                container = job;
                currentStep = null;
                break;
            }
            case 'PROC': {
                const proc = ProcNode(stmt.name || `(unnamed@${stmt.line})`, stmt.line);
                attachParams(
                    proc,
                    stmt,
                    diagnostics
                );

                procs.push(proc);
                (job ? job.procs : preJobProcs).push(proc);
                procStack = proc;
                container = proc;
                currentStep = null;
                break;
            }
            case 'PEND': {
                if (!procStack) {
                    diagnostics.push(makeDiagnostic(
                        'JCLP008',
                        {},
                        { line: stmt.line, column: stmt.opCol }
                    ));

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
                    diagnostics.push(makeDiagnostic(
                        'JCLO002',
                        { name: stmt.name || '(unnamed)' },
                        { line: stmt.line, column: stmt.opCol }
                    ));
                }

                const step = StepNode(
                    stmt.name,
                    'EXEC',
                    stmt.line
                );

                const params = attachParams(
                    step,
                    stmt,
                    diagnostics
                );

                const pgmParam = params.find(p => p.kind === 'keyword' && p.key === 'PGM');
                const procParam = params.find(p => p.kind === 'keyword' && p.key === 'PROC');
                const positional = params.find(p => p.kind === 'positional' && !p.empty);
                if (pgmParam) {
                    step.pgm = pgmParam.value;
                }

                if (procParam) {
                    step.calledProc = procParam.value;
                } else if (!pgmParam && positional) {
                    step.calledProc = positional.value;
                }

                container.steps.push(step);
                for (const node of ifStack) {
                    (node.sawElse ? node.elseBranch : node.thenBranch).push({ name: step.name, line: step.line });
                }

                currentStep = step;
                break;
            }
            case 'DD': {
                if (!currentStep) {
                    diagnostics.push(makeDiagnostic(
                        'JCLO003',
                        { name: stmt.name || '(unnamed)' },
                        { line: stmt.line, column: stmt.opCol }
                    ));

                    break;
                }

                const dd = DDNode(stmt.name, stmt.line);
                attachParams(
                    dd,
                    stmt,
                    diagnostics
                );

                if (stmt.instreamData) {
                    dd.instreamData = stmt.instreamData;
                }

                currentStep.dds.push(dd);
                break;
            }
            case 'IF': {
                const chars = ifConditionChars(stmt);
                const node = IfNode(chars.map(c => c.ch).join('').trim(), stmt.line);
                const { refs, errors, aliases } = parseCondition(chars, { line: stmt.line, col: stmt.opCol });
                for (const e of errors) {
                    diagnostics.push(makeDiagnostic(e.code, e.data, { line: e.line, column: e.col }));
                }

                for (const a of aliases) {
                    diagnostics.push(makeDiagnostic('JCLC009', { ch: a.ch }, { line: a.line, column: a.col }));
                }

                if (ifStack.length >= MAX_IF_DEPTH) {
                    diagnostics.push(makeDiagnostic('JCLC008', { max: MAX_IF_DEPTH }, { line: stmt.line, column: stmt.opCol }));
                }

                node.refs = refs;
                node.earlierSteps = container.steps.map(st => st.name).filter(Boolean);
                ifStack.push(node);
                if (container.ifs) {
                    container.ifs.push(node);
                }

                break;
            }
            case 'THEN':
                // Often combined with IF on the same operand text (IF ... THEN);
                // treat as a no-op continuation marker.
                break;
            case 'ELSE': {
                const node = ifStack[ifStack.length - 1];
                if (!node) {
                    diagnostics.push(makeDiagnostic(
                        'JCLP007',
                        {},
                        { line: stmt.line, column: stmt.opCol }
                    ));
                } else if (node.sawElse) {
                    diagnostics.push(makeDiagnostic('JCLC007', {}, { line: stmt.line, column: stmt.opCol }));
                } else {
                    node.sawElse = true;
                }

                break;
            }
            case 'ENDIF': {
                if (ifStack.length === 0) {
                    diagnostics.push(makeDiagnostic(
                        'JCLP006',
                        {},
                        { line: stmt.line, column: stmt.opCol }
                    ));
                } else {
                    const node = ifStack.pop();
                    node.endLine = stmt.line;
                }

                break;
            }
            case 'JCLLIB': {
                if (procStack) {
                    diagnostics.push(makeDiagnostic('JCLO008', {}, { line: stmt.line, column: stmt.opCol }));
                    break;
                }

                if (job && job.jcllib) {
                    diagnostics.push(makeDiagnostic('JCLO006', {}, { line: stmt.line, column: stmt.opCol }));
                    break;
                }

                if (!job || job.steps.length > 0) {
                    diagnostics.push(makeDiagnostic('JCLO005', {}, { line: stmt.line, column: stmt.opCol }));
                }

                // Kept even when misplaced, so its libraries can still explain JCLR001.
                if (job) {
                    job.jcllib = { type: 'Jcllib', line: stmt.line, params: [] };
                    attachParams(job.jcllib, stmt, diagnostics);
                }

                break;
            }
            case 'NOTIFY': {
                if (!job || procStack) {
                    diagnostics.push(makeDiagnostic('JCLO009', {}, { line: stmt.line, column: stmt.opCol }));
                } else if (job.notifies.length >= MAX_NOTIFY) {
                    diagnostics.push(makeDiagnostic('JCLO010', { max: MAX_NOTIFY }, { line: stmt.line, column: stmt.opCol }));
                }

                // Kept even when misplaced, so its values are still checked.
                if (job) {
                    const notify = { type: 'Notify', name: stmt.name, line: stmt.line, params: [] };
                    attachParams(notify, stmt, diagnostics);
                    job.notifies.push(notify);
                }

                break;
            }
            case 'JOBGROUP': {
                if (group) {
                    diagnostics.push(makeDiagnostic('JCLG002', { name: group.name }, { line: group.line, column: 1 }));
                }

                group = { type: 'JobGroup', name: stmt.name, line: stmt.line, params: [], jobs: [], sets: [], endLine: null };
                attachParams(group, stmt, diagnostics);
                jobGroups.push(group);
                set = null;
                groupJob = null;
                // A group stands apart from the jobs around it.
                job = null;
                ended = false;
                container = { steps: [] };
                currentStep = null;
                break;
            }
            case 'ENDGROUP': {
                if (!group) {
                    diagnostics.push(makeDiagnostic('JCLG003', {}, { line: stmt.line, column: stmt.opCol }));
                    break;
                }

                if ((stmt.name || '').toUpperCase() !== (group.name || '').toUpperCase()) {
                    diagnostics.push(makeDiagnostic('JCLG001', { name: stmt.name || '(none)', group: group.name }, { line: stmt.line, column: stmt.nameCol }));
                }

                if (set) {
                    diagnostics.push(makeDiagnostic('JCLG005', { name: set.name }, { line: set.line, column: 1 }));
                }

                group.endLine = stmt.line;
                group = null;
                set = null;
                break;
            }
            case 'JOBSET':
            case 'ENDSET':
            case 'GJOB':
            case 'SJOB':
            case 'AFTER':
            case 'BEFORE':
            case 'CONCURRENT': {
                if (!group) {
                    diagnostics.push(makeDiagnostic('JCLG010', { op }, { line: stmt.line, column: stmt.opCol }));
                    break;
                }

                const node = { type: op, name: stmt.name, line: stmt.line, params: [] };
                attachParams(node, stmt, diagnostics);
                if (op === 'JOBSET') {
                    set = node;
                    group.sets.push(node);
                } else if (op === 'ENDSET') {
                    if (!set) {
                        diagnostics.push(makeDiagnostic('JCLG005', { name: null }, { line: stmt.line, column: stmt.opCol }));
                    }

                    set = null;
                } else if (op === 'GJOB' || op === 'SJOB') {
                    if (op === 'SJOB' && !set) {
                        diagnostics.push(makeDiagnostic('JCLG006', {}, { line: stmt.line, column: stmt.opCol }));
                    }

                    groupJob = { ...node, deps: [] };
                    group.jobs.push(groupJob);
                } else if (!groupJob) {
                    diagnostics.push(makeDiagnostic('JCLG007', { op }, { line: stmt.line, column: stmt.opCol }));
                } else {
                    groupJob.deps.push(node);
                }

                break;
            }
            case 'SCHEDULE': {
                if (job) {
                    job.schedule = { type: 'Schedule', line: stmt.line, params: [] };
                    attachParams(job.schedule, stmt, diagnostics);
                }

                break;
            }
            case 'SET': {
                if (job) {
                    const set = { params: [] };
                    attachParams(set, stmt, diagnostics);
                    const assigned = set.params.filter(p => p.kind === 'keyword');
                    job.sets.push({ line: stmt.line, names: assigned.map(p => p.key), values: Object.fromEntries(assigned.map(p => [p.key, p.value])) });
                }

                break;
            }
            case 'INCLUDE': {
                break;
            }
            default:
                break; // passthrough ops (OUTPUT, XMIT)
        }
    }

    if (group) {
        diagnostics.push(makeDiagnostic('JCLG002', { name: group.name }, { line: group.line, column: 1 }));
        if (set) {
            diagnostics.push(makeDiagnostic('JCLG005', { name: set.name }, { line: set.line, column: 1 }));
        }
    }

    if (jobs.length === 0 && jobGroups.length === 0 && sawAnyStatement) {
        diagnostics.push(makeDiagnostic(
            'JCLO001',
            {},
            { line: statements.find(s => s.type === 'STMT')?.line || 1, column: 1 }
        ));
    }

    for (const node of ifStack) {
        diagnostics.push(makeDiagnostic(
            'JCLP005',
            {},
            { line: node.line, column: 1 }
        ));
    }

    if (procStack) {
        diagnostics.push(makeDiagnostic(
            'JCLP009',
            {},
            { line: procStack.line, column: 1 }
        ));
    }

    // Only when a JOB follows: a PROC on its own (or a library member) is fine.
    if (jobs.length) {
        for (const proc of preJobProcs) {
            diagnostics.push(makeDiagnostic('JCLO011', { name: proc.name }, { line: proc.line, column: 1 }));
        }
    }

    return {
        jobs,
        procs,
        jobGroups,
        diagnostics
    };
}

module.exports = { parse };
