const { makeDiagnostic } = require('../errors');
const { SYSTEM_SYMBOLS } = require('../keywords');

function buildProcMap(procs) {
    const map = new Map();
    for (const p of procs) {
        map.set(p.name.toUpperCase(), p);
    }

    return map;
}

function procLibraries(jcllib) {
    const order = jcllib.params.find(p => p.kind === 'keyword' && p.key === 'ORDER');
    return order ? order.subvalues || [order.value] : [];
}

/** Resolves EXEC ... PROC=xxx (or positional proc-name) against in-stream PROCs. */
function resolveProcCalls(
    job,
    procs,
    diagnostics,
    lookup = () => null // finds a catalogued procedure the user supplied
) {
    if (!job) {
        return;
    }

    const procMap = buildProcMap(procs);
    for (const step of job.steps) {
        if (step.pgm || !step.calledProc) {
            continue;
        }

        const resolved = procMap.get(step.calledProc.toUpperCase()) || lookup(step.calledProc, job);
        if (!resolved) {
            diagnostics.push(makeDiagnostic(
                'JCLR001',
                { name: step.calledProc, libraries: job.jcllib && procLibraries(job.jcllib) },
                {
                    line: step.line,
                    column: 1,
                    severity: 'warning' // could legitimately be a cataloged procedure we can't see
                }
            ));
        } else {
            step.resolvedProc = resolved;
        }
    }
}

// &NAME, but not the second & of a temporary dataset name (&&TEMP).
const SYMBOL_RE = /(?<!&)&([A-Za-z$#@][A-Za-z0-9$#@]*)\.?/g;
const usesCache = new WeakMap();

/** Every &SYMBOL in a PROC body, with where it is. */
function symbolUses(proc) {
    if (!usesCache.has(proc)) {
        const uses = [];
        for (const step of proc.steps) {
            for (const owner of [step, ...step.dds]) {
                for (const p of owner.params) {
                    const start = p.kind === 'keyword' ? p.valueCol : p.col;
                    for (const m of (p.value || '').matchAll(SYMBOL_RE)) {
                        uses.push({ sym: m[1].toUpperCase(), name: m[1], line: owner.line, column: start + m.index });
                    }
                }
            }
        }

        usesCache.set(proc, uses);
    }

    return usesCache.get(proc);
}

function keywordNames(params) {
    return params.filter(p => p.kind === 'keyword' && !p.key.includes('.')).map(p => p.key);
}

function reportUndefined(proc, defined, step, diagnostics) {
    for (const use of symbolUses(proc)) {
        if (!defined.has(use.sym)) {
            diagnostics.push(makeDiagnostic(
                'JCLR002',
                { sym: use.name, proc: proc.name, step: step && (step.name || '(unnamed)') },
                { line: use.line, column: use.column }
            ));
        }
    }
}

/**
 * Checks the symbols of each PROC call by call: a symbol is defined by a
 * default on the PROC statement, a SET earlier in the job, the calling EXEC,
 * or a system symbol. A PROC nobody calls is checked against its defaults.
 */
function validateSymbolicParams(jobs, procs, diagnostics) {
    const called = new Set();
    for (const job of jobs) {
        for (const step of job.steps.filter(s => s.resolvedProc)) {
            const proc = step.resolvedProc;
            called.add(proc);
            const setBefore = (job.sets || []).filter(set => set.line < step.line).flatMap(set => set.names);
            const defined = new Set([...SYSTEM_SYMBOLS, ...keywordNames(proc.params), ...setBefore, ...keywordNames(step.params)]);
            reportUndefined(proc, defined, step, diagnostics);
        }
    }

    for (const proc of procs.filter(p => !called.has(p))) {
        reportUndefined(proc, new Set([...SYSTEM_SYMBOLS, ...keywordNames(proc.params)]), null, diagnostics);
    }
}

/** For steps invoking a resolved in-stream PROC, checks that overriding DD names match a DD in the proc. */
function validateDDOverrides(job, diagnostics) {
    if (!job) {
        return;
    }

    for (const step of job.steps) {
        if (!step.resolvedProc || step.dds.length === 0) {
            continue;
        }

        const procStepsByName = new Map();
        for (const ps of step.resolvedProc.steps) {
            procStepsByName.set((ps.name || '').toUpperCase(), ps);
        }

        const allDDNames = new Set();
        for (const ps of step.resolvedProc.steps) {
            for (const d of ps.dds) {
                if (d.name) {
                    allDDNames.add(d.name.toUpperCase());
                }
            }
        }

        for (const dd of step.dds) {
            if (!dd.name) {
                continue;
            }

            if (dd.name.includes('.')) {
                const [stepName, ddName] = dd.name.split('.');
                const targetStep = procStepsByName.get(stepName.toUpperCase());
                if (!targetStep) {
                    diagnostics.push(makeDiagnostic(
                        'JCLR003',
                        { name: dd.name, step: step.resolvedProc.name },
                        {
                            line: dd.line,
                            column: 1,
                            severity: 'warning'
                        }
                    ));

                    continue;
                }

                const found = targetStep.dds.some(d => d.name && d.name.toUpperCase() === ddName.toUpperCase());
                if (!found) {
                    diagnostics.push(makeDiagnostic(
                        'JCLR003',
                        { name: ddName, step: stepName },
                        {
                            line: dd.line,
                            column: 1,
                            severity: 'warning'
                        }
                    ));
                }
            } else if (!allDDNames.has(dd.name.toUpperCase())) {
                diagnostics.push(makeDiagnostic(
                    'JCLR003',
                    { name: dd.name, step: step.resolvedProc.name },
                    {
                        line: dd.line,
                        column: 1,
                        severity: 'warning'
                    }
                ));
            }
        }
    }
}

module.exports = {
    resolveProcCalls,
    validateSymbolicParams,
    symbolUses,
    validateDDOverrides
};
