const { lex } = require('./lexer');
const { parse } = require('./parser');
const { checkDDStatements } = require('./rules/ddRules');
const { checkAllParams, checkStepsAndDDs } = require('./rules/paramRules');
const { resolveProcCalls, validateSymbolicParams, validateDDOverrides } = require('./rules/procRules');
const { checkJesStatements } = require('./rules/jesRules');
const { checkIfReferences } = require('./rules/ifRules');
const { checkJobGroups } = require('./rules/groupRules');
const { checkDatasetFlow } = require('./rules/flowRules');
const { checkProfile } = require('./rules/profileRules');
const { profileProblem } = require('./profile');
const { applySuppressions } = require('./suppressions');
const { DEFAULT_ZOS_LEVEL, DEFAULT_JES, isZosLevel, isJes, jesAvailable } = require('./levels');
const { createLibrary, expandIncludes, orderOf } = require('./library');

// A catalogued procedure needn't start with PROC or end with PEND; add them
// so it parses like an in-stream PROC.
function procStatements(entry, statements) {
    const stmts = statements.filter(s => s.type === 'STMT');
    const first = stmts[0];
    const last = stmts[stmts.length - 1];
    const synthetic = (op, line) => ({ type: 'STMT', name: op === 'PROC' ? entry.member.toUpperCase() : '', op, operand: '', comment: '', opCol: 1, operandCol: 1, nameCol: 3, line, endLine: line, raw: [] });
    const base = (first || { line: 0 }).line;
    return [
        ...(first && first.op.toUpperCase() === 'PROC' ? [] : [synthetic('PROC', base)]),
        ...statements,
        ...(last && last.op.toUpperCase() === 'PEND' ? [] : [synthetic('PEND', last ? last.endLine : base)])
    ];
}

// Where each parameter and value is written, and how long it is on that
// line, so a diagnostic at one underlines all of it.
function paramSpans(roots) {
    const spans = new Map();
    const seen = new Set();
    const walk = value => {
        if (!value || typeof value !== 'object' || seen.has(value)) {
            return;
        }

        seen.add(value);
        if (Array.isArray(value.params)) {
            for (const p of value.params) {
                if (p.line !== undefined) {
                    spans.set(`${p.line}:${p.col}`, p.length);
                }

                if (p.valueLine !== undefined) {
                    spans.set(`${p.valueLine}:${p.valueCol}`, p.valueLength);
                }
            }
        }

        Object.values(value).forEach(walk);
    };

    walk(roots);
    return spans;
}

/**
 * Runs the full pipeline over raw JCL source text.
 * @param {string} source
 * @param {{ zosLevel?: string, jes?: string, library?: object[], profile?: object }} [options]
 *   defaults to the newest z/OS level and JES2; `library` holds { dsn, member, source } entries for
 *   catalogued procedures and INCLUDE members; `profile` is a site profile (see profile.js)
 * @returns {{ diagnostics: object[], ast: object, datasets: object[], stats: object, zosLevel: string, jes: string }}
 */
// A job sent to the internal reader can itself send one; this is deep enough.
const MAX_READER_DEPTH = 5;

// Checks the in-stream JCL of each DD sent to the internal reader as its own
// job stream, and moves its diagnostics onto the lines where it is written.
function checkInternalReaderJobs(jobs, options, depth) {
    const found = [];
    for (const dd of jobs.flatMap(job => job.steps.flatMap(step => step.dds)).filter(d => d.internalReader)) {
        if (depth >= MAX_READER_DEPTH) {
            continue;
        }

        const inner = validate(dd.instreamData.join('\n'), { ...options, depth: depth + 1 });
        for (const d of inner.diagnostics) {
            if (!d.member) {
                d.line += dd.instreamLine - 1;
            }

            found.push(d);
        }
    }

    return found;
}

function validate(source, { zosLevel = DEFAULT_ZOS_LEVEL, jes = DEFAULT_JES, library: entries = [], profile = null, depth = 0 } = {}) {
    // Callers check the level first (the API answers 400), so a bad one here
    // is a bug rather than something to fall back from silently.
    if (!isZosLevel(zosLevel)) {
        throw new Error(`Unknown z/OS level: ${zosLevel}`);
    }

    if (!isJes(jes) || !jesAvailable(jes, zosLevel)) {
        throw new Error(`${jes} can't be checked at z/OS ${zosLevel}`);
    }

    const problem = profileProblem(profile);
    if (problem) {
        throw new Error(problem);
    }

    const extraKeywords = Object.fromEntries(Object.entries((profile && profile.extraKeywords) || {}).map(([k, v]) => [k.toUpperCase(), v]));
    const context = { zosLevel, jes, extraKeywords };
    const { statements: written, diagnostics: lexDiags } = lex(source || '', context);
    const library = createLibrary(entries, context);
    const statements = expandIncludes(written, library, lexDiags);
    const {
        jobs,
        procs,
        jobGroups,
        diagnostics: parseDiags
    } = parse(statements, context);
    const ruleDiags = [];

    // Catalogued procedures from the library, each parsed once and then
    // checked with the in-stream ones.
    const catalogued = new Map();
    const lookup = (name, job) => {
        const entry = library.find(name, job.jcllib ? orderOf(job.jcllib.params) : []);
        if (entry && !catalogued.has(entry)) {
            const memberStmts = expandIncludes(library.read(entry, lexDiags), library, lexDiags);
            const parsed = parse(procStatements(entry, memberStmts), context);
            // A member is a procedure, not a job, so it has no JOB statement.
            parseDiags.push(...parsed.diagnostics.filter(d => d.code !== 'JCLO001'));
            catalogued.set(entry, parsed.procs[0] || null);
            procs.push(...parsed.procs.slice(0, 1));
        }

        return entry ? catalogued.get(entry) : null;
    };

    // Each job is checked on its own; a step only sees its own job's PROCs.
    for (const job of jobs) {
        resolveProcCalls(job, job.procs, ruleDiags, lookup); // first, so paramRules can see the PROCs
        validateDDOverrides(job, ruleDiags);
        checkAllParams(job, ruleDiags, context);
        checkDDStatements(job, ruleDiags);
        checkIfReferences(job, 'job', ruleDiags);
    }

    checkJobGroups(jobGroups, jobs, ruleDiags, context);
    validateSymbolicParams(jobs, procs, ruleDiags);
    const datasets = checkDatasetFlow(jobs, procs, ruleDiags);
    checkProfile(jobs, procs, profile, ruleDiags);
    ruleDiags.push(...checkInternalReaderJobs(jobs, { zosLevel, jes, library: entries, profile }, depth));
    checkJesStatements(statements, ruleDiags, context);
    // Also validate parameters inside in-stream PROC bodies themselves.
    for (const proc of procs) {
        checkStepsAndDDs(proc.steps, ruleDiags, context);
        checkDDStatements({ steps: proc.steps }, ruleDiags);
        checkIfReferences(proc, 'procedure', ruleDiags);
    }

    // The profile can move a code to another severity, or switch it off.
    const severity = new Map(Object.entries((profile && profile.severity) || {}).map(([k, v]) => [k.toUpperCase(), v]));
    const all = [
        ...lexDiags,
        ...parseDiags,
        ...ruleDiags
    ].filter(d => severity.get(d.code) !== 'off');
    for (const d of all.filter(x => severity.has(x.code))) {
        d.severity = severity.get(d.code);
    }

    applySuppressions(source, written, all);
    const spans = paramSpans({ jobs, procs, jobGroups });
    for (const d of all.filter(x => x.length === 1)) {
        d.length = spans.get(`${d.line}:${d.column}`) || 1;
    }

    all.sort((a, b) => (a.line - b.line) || (a.column - b.column));
    all.forEach(library.locate);
    datasets.forEach(job => job.datasets.forEach(d => d.touches.forEach(library.locate)));

    const counted = all.filter(d => !d.suppressed);
    const stats = {
        errors: counted.filter(d => d.severity === 'error').length,
        warnings: counted.filter(d => d.severity === 'warning').length,
        info: counted.filter(d => d.severity === 'info').length,
        suppressed: all.length - counted.length,
        statementCount: statements.filter(s => s.type === 'STMT').length,
        jobCount: jobs.length,
        stepCount: jobs.reduce((n, job) => n + job.steps.length, 0),
        procCount: procs.length,
        valid: !counted.some(d => d.severity === 'error')
    };

    return {
        diagnostics: all,
        ast: { jobs, procs, jobGroups },
        datasets,
        stats,
        zosLevel,
        jes
    };
}

module.exports = { validate };
