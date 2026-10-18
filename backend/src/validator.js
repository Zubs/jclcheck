const { lex } = require('./lexer');
const { parse } = require('./parser');
const { checkDDStatements } = require('./rules/ddRules');
const { checkAllParams, checkStepsAndDDs } = require('./rules/paramRules');
const { resolveProcCalls, validateSymbolicParams, validateDDOverrides } = require('./rules/procRules');
const { checkJesStatements } = require('./rules/jesRules');
const { DEFAULT_ZOS_LEVEL, DEFAULT_JES, isZosLevel, isJes, jesAvailable } = require('./levels');

/**
 * Runs the full pipeline over raw JCL source text.
 * @param {string} source
 * @param {{ zosLevel?: string, jes?: string }} [options] defaults to the newest z/OS level and JES2
 * @returns {{ diagnostics: object[], ast: object, stats: object, zosLevel: string, jes: string }}
 */
function validate(source, { zosLevel = DEFAULT_ZOS_LEVEL, jes = DEFAULT_JES } = {}) {
    // Callers check the level first (the API answers 400), so a bad one here
    // is a bug rather than something to fall back from silently.
    if (!isZosLevel(zosLevel)) {
        throw new Error(`Unknown z/OS level: ${zosLevel}`);
    }

    if (!isJes(jes) || !jesAvailable(jes, zosLevel)) {
        throw new Error(`${jes} can't be checked at z/OS ${zosLevel}`);
    }

    const context = { zosLevel, jes };
    const { statements, diagnostics: lexDiags } = lex(source || '', context);
    const {
        jobs,
        procs,
        diagnostics: parseDiags
    } = parse(statements, context);
    const ruleDiags = [];
    // Each job is checked on its own; a step only sees its own job's PROCs.
    for (const job of jobs) {
        resolveProcCalls(job, job.procs, ruleDiags); // first, so paramRules can see the PROCs
        validateDDOverrides(job, ruleDiags);
        checkAllParams(job, ruleDiags, context);
        checkDDStatements(job, ruleDiags);
    }

    validateSymbolicParams(procs, ruleDiags);
    checkJesStatements(statements, ruleDiags, context);
    // Also validate parameters inside in-stream PROC bodies themselves.
    for (const proc of procs) {
        checkStepsAndDDs(proc.steps, ruleDiags, context);
        checkDDStatements({ steps: proc.steps }, ruleDiags);
    }

    const all = [
        ...lexDiags,
        ...parseDiags,
        ...ruleDiags
    ];

    all.sort((a, b) => (a.line - b.line) || (a.column - b.column));

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
        ast: { jobs, procs },
        stats,
        zosLevel,
        jes
    };
}

module.exports = { validate };
