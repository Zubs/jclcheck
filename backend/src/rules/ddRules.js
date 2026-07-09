const { makeDiagnostic } = require('../errors');

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
    const hasReferBack = params.some(p => p.kind === 'keyword' && ['DSN', 'DSNAME'].includes(p.key) && p.value.startsWith('*.'));

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

module.exports = { checkDDStatements };
