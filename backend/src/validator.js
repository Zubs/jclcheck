const { lex } = require('./lexer');
const { parse } = require('./parser');
const { checkDDStatements } = require('./rules/ddRules');
const { checkAllParams, checkStepsAndDDs } = require('./rules/paramRules');
const { resolveProcCalls, validateSymbolicParams, validateDDOverrides } = require('./rules/procRules');
const { checkJesStatements } = require('./rules/jesRules');
const { checkIfReferences } = require('./rules/ifRules');
const { checkJobGroups } = require('./rules/groupRules');
const { checkDatasetFlow } = require('./rules/flowRules');
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

/**
 * Runs the full pipeline over raw JCL source text.
 * @param {string} source
 * @param {{ zosLevel?: string, jes?: string, library?: object[] }} [options] defaults to the newest
 *   z/OS level and JES2; `library` holds { dsn, member, source } entries for catalogued procedures
 *   and INCLUDE members
 * @returns {{ diagnostics: object[], ast: object, datasets: object[], stats: object, zosLevel: string, jes: string }}
 */
function validate(source, { zosLevel = DEFAULT_ZOS_LEVEL, jes = DEFAULT_JES, library: entries = [] } = {}) {
    // Callers check the level first (the API answers 400), so a bad one here
    // is a bug rather than something to fall back from silently.
    if (!isZosLevel(zosLevel)) {
        throw new Error(`Unknown z/OS level: ${zosLevel}`);
    }

    if (!isJes(jes) || !jesAvailable(jes, zosLevel)) {
        throw new Error(`${jes} can't be checked at z/OS ${zosLevel}`);
    }

    const context = { zosLevel, jes };
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
    checkJesStatements(statements, ruleDiags, context);
    // Also validate parameters inside in-stream PROC bodies themselves.
    for (const proc of procs) {
        checkStepsAndDDs(proc.steps, ruleDiags, context);
        checkDDStatements({ steps: proc.steps }, ruleDiags);
        checkIfReferences(proc, 'procedure', ruleDiags);
    }

    const all = [
        ...lexDiags,
        ...parseDiags,
        ...ruleDiags
    ];

    all.sort((a, b) => (a.line - b.line) || (a.column - b.column));
    all.forEach(library.locate);
    datasets.forEach(job => job.datasets.forEach(d => d.touches.forEach(library.locate)));

    const stats = {
        errors: all.filter(d => d.severity === 'error').length,
        warnings: all.filter(d => d.severity === 'warning').length,
        info: all.filter(d => d.severity === 'info').length,
        statementCount: statements.filter(s => s.type === 'STMT').length,
        jobCount: jobs.length,
        stepCount: jobs.reduce((n, job) => n + job.steps.length, 0),
        procCount: procs.length,
        valid: !all.some(d => d.severity === 'error')
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
