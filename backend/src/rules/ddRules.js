const { makeDiagnostic } = require('../errors');
const { parseDelimiter } = require('../lexer');

function checkDDStatements(job, diagnostics) {
    if (!job) {
        return;
    }

    for (const step of job.steps) {
        const seen = new Map();
        for (const dd of step.dds) {
            if (dd.name) {
                const key = dd.name.toUpperCase();
                if (seen.has(key)) {
                    diagnostics.push(makeDiagnostic('JCLD001', { name: dd.name, step: step.name }, {
                        line: dd.line,
                        column: 1
                    }));
                } else {
                    seen.set(key, dd.line);
                }
            }

            checkDataSource(
                dd,
                step,
                diagnostics
            );

            checkDelimiter(dd, diagnostics);
        }
    }
}

function checkDataSource(dd, step, diagnostics) {
    const params = dd.params;
    const hasDSN = params.some(p => p.kind === 'keyword' && (p.key === 'DSN' || p.key === 'DSNAME'));
    const hasDummy = params.some(p => (p.kind === 'keyword' && p.key === 'DUMMY') || (p.kind === 'positional' && p.value.toUpperCase() === 'DUMMY'));
    const hasSysout = params.some(p => p.kind === 'keyword' && p.key === 'SYSOUT');
    const hasStar = params.some(p => p.kind === 'positional' && p.value.trim() === '*');
    const hasData = params.some(p => (p.kind === 'positional' && p.value.toUpperCase() === 'DATA') || dd.instreamData);
    const hasLike = params.some(p => p.kind === 'keyword' && p.key === 'LIKE');

    const sources = [];
    if (hasDSN) {
        sources.push('DSN');
    }

    if (hasDummy) {
        sources.push('DUMMY');
    }

    if (hasSysout) {
        sources.push('SYSOUT');
    }

    if (hasStar || hasData) {
        sources.push('instream data');
    }

    if (hasLike) {
        sources.push('LIKE');
    }

    if (sources.length === 0 && !dd.instreamData) {
        diagnostics.push(makeDiagnostic('JCLD002', {}, { line: dd.line, column: 1 }));
    } else if (sources.length > 1) {
        diagnostics.push(makeDiagnostic(
            'JCLD003',
            { a: sources[0], b: sources[1] },
            { line: dd.line, column: 1 }
        ));
    }
}

function checkDelimiter(dd, diagnostics) {
    const dlm = dd.params.find(p => p.kind === 'keyword' && p.key === 'DLM');
    if (!dlm) {
        return;
    }

    if (!dd.instreamData) {
        diagnostics.push(makeDiagnostic('JCLK006', {}, { line: dd.line, column: dlm.col }));
    } else if (!parseDelimiter(dlm.value)) {
        diagnostics.push(makeDiagnostic('JCLS011', { value: dlm.value }, { line: dd.line, column: dlm.valueCol }));
    }
}

module.exports = { checkDDStatements };
