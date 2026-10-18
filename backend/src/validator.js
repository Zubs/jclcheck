const { lex } = require('./lexer');
const { parse } = require('./parser');
const { checkDDStatements } = require('./rules/ddRules');
const { checkAllParams, checkStepsAndDDs } = require('./rules/paramRules');
const { runProcRules } = require('./rules/procRules');
const { DEFAULT_ZOS_LEVEL, isZosLevel } = require('./levels');

/**
 * Runs the full pipeline over raw JCL source text.
 * @param {string} source
 * @param {{ zosLevel?: string }} [options] defaults to the newest z/OS level
 * @returns {{ diagnostics: object[], ast: object, stats: object, zosLevel: string }}
 */
function validate(source, { zosLevel = DEFAULT_ZOS_LEVEL } = {}) {
    // Callers check the level first (the API answers 400), so a bad one here
    // is a bug rather than something to fall back from silently.
    if (!isZosLevel(zosLevel)) {
        throw new Error(`Unknown z/OS level: ${zosLevel}`);
    }

    const context = { zosLevel };
    const { statements, diagnostics: lexDiags } = lex(source || '');
    const {
        job,
        procs,
        diagnostics: parseDiags
    } = parse(statements, context);
    const ruleDiags = [];
    runProcRules(
        job,
        procs,
        ruleDiags
    ); // resolve proc calls first so paramRules can see them

    checkAllParams(job, ruleDiags, context);
    checkDDStatements(job, ruleDiags);
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
        stepCount: job ? job.steps.length : 0,
        procCount: procs.length,
        valid: !all.some(d => d.severity === 'error')
    };

    return {
        diagnostics: all,
        ast: { job, procs },
        stats,
        zosLevel
    };
}

module.exports = { validate };
