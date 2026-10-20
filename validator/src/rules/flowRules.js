// Follows each dataset through a job's steps, including the steps of called
// PROCs: temporary datasets read before they exist (JCLF001), passes nobody
// reads (JCLF002), a second NEW,CATLG (JCLF003), reads after a delete
// (JCLF004) and referbacks to nothing (JCLF005). Also builds the `datasets`
// list behind the workbench's grid.

const { makeDiagnostic } = require('../errors');
const { closest } = require('../valueRules');
const { valuePosition } = require('../paramTokenizer');

const SYMBOL_RE = /(?<!&)&([A-Za-z$#@][A-Za-z0-9$#@]*)\.?/g;
const STILL_SYMBOLIC_RE = /(?<!&)&[A-Za-z$#@]/;
const GENERATION_RE = /\([+-]?\d+\)$/;
const STATUS_ACTION = { NEW: 'N', OLD: 'R', SHR: 'R', MOD: 'M' };

function keyword(params, ...keys) {
    return params.find(p => p.kind === 'keyword' && keys.includes(p.key));
}

function unquote(value) {
    const m = value.match(/^'(.*)'$/);
    return m ? m[1].replace(/''/g, "'") : value;
}

function symbolPairs(params) {
    return params.filter(p => p.kind === 'keyword' && !p.key.includes('.')).map(p => [p.key, p.value]);
}

function substitute(value, symbols) {
    return value.replace(SYMBOL_RE, (whole, name) => {
        const known = symbols.get(name.toUpperCase());
        return known === undefined ? whole : unquote(known);
    });
}

// Lines of the steps inside an IF/THEN/ELSE, which may not run.
function conditionalLines(container) {
    return new Set((container.ifs || []).flatMap(node => [...node.thenBranch, ...node.elseBranch].map(s => s.line)));
}

// A DD override named PROCSTEP.DD on the calling step replaces that DD's
// keywords one by one; an override naming no DD adds one. An override with no
// procedure step name applies to the PROC's first step, as z/OS does.
function withOverrides(procStep, call, first) {
    const prefix = `${(procStep.name || '').toUpperCase()}.`;
    const named = d => d.name && d.name.toUpperCase().startsWith(prefix);
    const unqualified = d => first && d.name && !d.name.includes('.');
    const overrides = call.dds.filter(d => named(d) || unqualified(d))
        .map(d => (named(d) ? d : { ...d, name: prefix + d.name }));
    const used = new Set();
    const dds = procStep.dds.map(dd => {
        const override = overrides.find(o => dd.name && o.name.toUpperCase() === prefix + dd.name.toUpperCase());
        if (!override) {
            return dd;
        }

        used.add(override);
        const keys = new Set(override.params.map(p => p.key));
        return { name: dd.name, line: dd.line, params: [...override.params, ...dd.params.filter(p => !keys.has(p.key))] };
    });

    for (const added of overrides.filter(o => !used.has(o))) {
        dds.push({ name: added.name.slice(prefix.length), line: added.line, params: added.params });
    }

    return dds;
}

// Each step as the flow sees it: a step calling a PROC becomes one flow step
// per PROC step; a step calling a PROC that wasn't found is opaque.
function jobFlowSteps(job) {
    const conditional = conditionalLines(job);
    const setsBefore = line => (job.sets || []).filter(set => set.line < line).flatMap(set => Object.entries(set.values || {}));
    const steps = [];
    for (const step of job.steps) {
        const name = (step.name || '').toUpperCase();
        if (step.resolvedProc) {
            const proc = step.resolvedProc;
            const symbols = new Map([...symbolPairs(proc.params), ...setsBefore(step.line), ...symbolPairs(step.params)]);
            const procConditional = conditionalLines(proc);
            for (const ps of proc.steps) {
                steps.push({
                    label: `${step.name || '?'}.${ps.name || '?'}`,
                    name,
                    procStep: (ps.name || '').toUpperCase(),
                    call: step,
                    dds: withOverrides(ps, step, ps === proc.steps[0]),
                    symbols,
                    conditional: conditional.has(step.line) || procConditional.has(ps.line)
                });
            }
        } else {
            steps.push({
                label: step.name || `(line ${step.line})`,
                name,
                dds: step.calledProc && !step.pgm ? [] : step.dds,
                opaque: Boolean(step.calledProc && !step.pgm),
                symbols: new Map(setsBefore(step.line)),
                conditional: conditional.has(step.line)
            });
        }
    }

    return steps;
}

function procFlowSteps(proc) {
    const conditional = conditionalLines(proc);
    const symbols = new Map(symbolPairs(proc.params));
    return proc.steps.map(ps => ({
        label: ps.name || `(line ${ps.line})`,
        name: (ps.name || '').toUpperCase(),
        dds: ps.dds,
        symbols,
        conditional: conditional.has(ps.line)
    }));
}

const ddNamed = (dds, name) => dds.find(d => d.name && d.name.toUpperCase() === name);

// The earlier DD a referback such as *.S1.OUT names, or why there is none.
function resolveReferback(ref, steps, i, j) {
    const parts = ref.slice(2).split('.');
    const current = steps[i];
    const earlier = steps.slice(0, i);
    if (parts.length === 1) {
        const dd = ddNamed(current.dds.slice(0, j), parts[0]);
        if (dd) {
            return { dd, step: current };
        }

        return { detail: ddNamed(current.dds, parts[0]) ? 'names a DD that comes later in this step' : 'names no earlier DD in this step' };
    }

    let matches;
    if (parts.length === 2) {
        matches = current.call
            ? earlier.filter(s => s.call === current.call && s.procStep === parts[0])
            : earlier.filter(s => !s.call && s.name === parts[0]);
    } else if (parts.length === 3) {
        matches = earlier.filter(s => s.call && s.name === parts[0] && s.procStep === parts[1]);
        if (!matches.length && earlier.some(s => s.opaque && s.name === parts[0])) {
            return { unknown: true };
        }
    } else {
        return { detail: 'has too many parts' };
    }

    if (!matches.length) {
        return { detail: `names no earlier step ${parts.slice(0, -1).join('.')}` };
    }

    const ddName = parts[parts.length - 1];
    const step = matches[matches.length - 1];
    const dd = ddNamed(step.dds, ddName);
    return dd ? { dd, step } : { detail: `names DD ${ddName}, which step ${step.label} doesn't have` };
}

function at(param, owner, index = 0) {
    const pos = valuePosition(param, index);
    return { line: pos.line ?? owner.line, column: pos.col };
}

// The dataset name a DD's DSN gives, or null when it can't be known here.
function datasetName(dd, symbols) {
    const dsn = keyword(dd.params, 'DSN', 'DSNAME');
    if (!dsn) {
        return null;
    }

    const value = substitute(dsn.value, symbols).toUpperCase();
    if (value.startsWith("'") || STILL_SYMBOLIC_RE.test(value) || GENERATION_RE.test(value)) {
        return null;
    }

    return value.replace(/\(.*\)$/, '');
}

function disposition(dd, symbols) {
    const disp = keyword(dd.params, 'DISP');
    const text = disp ? substitute(disp.value, symbols) : '';
    if (STILL_SYMBOLIC_RE.test(text)) {
        return null;
    }

    const parts = text.replace(/^\(|\)$/g, '').split(',').map(s => s.trim().toUpperCase());
    return { status: parts[0] || 'NEW', normal: parts[1] || '' };
}

/** Follows the datasets through `steps`, adding diagnostics; returns each dataset's touches. */
function followSteps(steps, diagnostics) {
    const states = new Map();
    const datasets = [];
    const report = (code, data, where, severity) => diagnostics.push(makeDiagnostic(code, data, { ...where, ...(severity ? { severity } : {}) }));
    const opaqueBefore = i => steps.slice(0, i).some(s => s.opaque);

    steps.forEach((step, i) => {
        const endOfStep = [];
        step.dds.forEach((dd, j) => {
            // VOL=REF=*.STEP.DD and DCB=*.STEP.DD (or DCB=(*.STEP.DD,...)).
            const refs = [['VOL', /REF=(\*\.[A-Za-z0-9$#@.]+)/i, 4], ['VOLUME', /REF=(\*\.[A-Za-z0-9$#@.]+)/i, 4], ['DCB', /^\(?(\*\.[A-Za-z0-9$#@.]+)/, 0]];
            for (const [key, pattern, skip] of refs) {
                const p = keyword(dd.params, key);
                const m = p && p.value.match(pattern);
                const target = m && resolveReferback(m[1].toUpperCase(), steps, i, j);
                if (target && target.detail) {
                    report('JCLF005', { ref: m[1], detail: target.detail }, at(p, dd, m.index + skip + (m[0].startsWith('(') ? 1 : 0)));
                }
            }

            const dsn = keyword(dd.params, 'DSN', 'DSNAME');
            let name = datasetName(dd, step.symbols);
            if (name && name.startsWith('*.')) {
                const target = resolveReferback(name, steps, i, j);
                if (target.detail) {
                    report('JCLF005', { ref: dsn.value, detail: target.detail }, at(dsn, dd));
                }

                name = target.dd ? datasetName(target.dd, target.step.symbols) : null;
                if (name && name.startsWith('*.')) {
                    name = null;
                }
            }

            const disp = name && disposition(dd, step.symbols);
            if (!name || !disp || !STATUS_ACTION[disp.status]) {
                return;
            }

            const where = at(dsn, dd);
            const temporary = name.startsWith('&&');
            if (!states.has(name)) {
                const entry = { name, temporary, touches: [] };
                states.set(name, { entry });
                datasets.push(entry);
            }

            const state = states.get(name);
            const action = STATUS_ACTION[disp.status];
            const actions = [action];
            if (action === 'R') {
                if (state.deleted) {
                    report('JCLF004', { name, step: step.label, deletedBy: state.deleted.step, implicit: state.deleted.implicit }, where);
                } else if (temporary && !state.created && !opaqueBefore(i)) {
                    const known = [...states.values()].filter(s => s.created && s.entry.temporary).map(s => s.entry.name);
                    const guess = closest(name, known);
                    report('JCLF001', {
                        name,
                        step: step.label,
                        closest: guess && { name: guess, step: states.get(guess).created }
                    }, where, step.conditional ? 'warning' : null);
                }

                state.pass = null;
            } else {
                if (action === 'N' && disp.normal === 'CATLG' && state.catalogued && !state.deleted) {
                    report('JCLF003', { name, step: step.label, first: state.catalogued }, where);
                }

                state.created = state.created || step.label;
                state.deleted = null;
                state.pass = null;
            }

            if (disp.normal === 'PASS') {
                actions.push('P');
            } else if (disp.normal === 'DELETE') {
                actions.push('D');
            }

            state.entry.touches.push({ step: step.label, dd: dd.name || '', line: where.line, column: where.column, actions });
            endOfStep.push(() => {
                if (disp.normal === 'PASS') {
                    state.pass = { step: step.label, index: i, where };
                } else if (disp.normal === 'DELETE' || (action === 'N' && !disp.normal)) {
                    state.deleted = { step: step.label, implicit: disp.normal !== 'DELETE' };
                    state.catalogued = null;
                } else if (disp.normal === 'CATLG') {
                    state.catalogued = step.label;
                }
            });
        });

        endOfStep.forEach(apply => apply());
    });

    for (const state of states.values()) {
        if (state.pass && !steps.slice(state.pass.index + 1).some(s => s.opaque)) {
            report('JCLF002', { name: state.entry.name, step: state.pass.step }, state.pass.where);
        }
    }

    return datasets;
}

/**
 * Checks dataset flow in every job and in every PROC nobody calls. Returns
 * `{ job, steps, datasets }` for each job that touches a dataset.
 */
function checkDatasetFlow(jobs, procs, diagnostics) {
    const found = [];
    const result = [];
    const called = new Set();
    for (const job of jobs) {
        const steps = jobFlowSteps(job);
        steps.forEach(s => s.call && called.add(s.call.resolvedProc));
        const datasets = followSteps(steps, found);
        if (datasets.length) {
            result.push({ job: job.name || '', steps: steps.map(s => s.label), datasets });
        }
    }

    for (const proc of procs.filter(p => !called.has(p))) {
        followSteps(procFlowSteps(proc), found);
    }

    // An in-stream PROC called twice would report the same line twice.
    const seen = new Set();
    for (const d of found) {
        const key = `${d.code} ${d.line} ${d.column}`;
        if (!seen.has(key)) {
            seen.add(key);
            diagnostics.push(d);
        }
    }

    return result;
}

module.exports = { checkDatasetFlow };
