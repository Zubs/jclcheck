const { makeDiagnostic } = require('../errors');
const { parseDelimiter } = require('../lexer');

function checkDDStatements(job, diagnostics) {
    if (!job) {
        return;
    }

    for (const step of job.steps) {
        checkInternalReader(step, diagnostics);
        const seen = new Map();
        for (const dd of step.dds) {
            if (dd.name) {
                const key = dd.name.toUpperCase();
                if (seen.has(key)) {
                    // Valid JCL, so a warning rather than an error.
                    diagnostics.push(makeDiagnostic('JCLD001', { name: dd.name, step: step.name }, {
                        line: dd.line,
                        column: 1,
                        severity: 'warning'
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
            checkPathOptions(dd, diagnostics);
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
    const hasPath = params.some(p => p.kind === 'keyword' && p.key === 'PATH');
    // These name where the data comes from without conflicting with the rest:
    // a subsystem, a DD defined later (DDNAME=), or a new temporary dataset.
    // LIKE only copies a model's attributes, so with no DSN it is a new temporary dataset.
    const hasOtherSource = params.some(p => p.kind === 'keyword' && ['SUBSYS', 'DDNAME', 'SPACE', 'LIKE'].includes(p.key));

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

    if (hasPath) {
        sources.push('PATH');
    }

    // A model's attributes can't apply to SYSOUT or in-stream data.
    if (hasLike && (hasSysout || hasStar || hasData)) {
        diagnostics.push(makeDiagnostic(
            'JCLD003',
            { a: 'LIKE', b: hasSysout ? 'SYSOUT' : 'instream data' },
            { line: dd.line, column: 1 }
        ));
    }

    if (sources.length === 0 && !dd.instreamData && !hasOtherSource) {
        diagnostics.push(makeDiagnostic('JCLD002', {}, { line: dd.line, column: 1 }));
    } else if (sources.length > 1) {
        diagnostics.push(makeDiagnostic(
            'JCLD003',
            { a: sources[0], b: sources[1] },
            { line: dd.line, column: 1 }
        ));
    }
}

const ACCESS_MODES = ['ORDONLY', 'OWRONLY', 'ORDWR'];

function checkPathOptions(dd, diagnostics) {
    const find = key => dd.params.find(p => p.kind === 'keyword' && p.key === key);
    const pathParam = find('PATH');
    if (!pathParam) {
        const option = ['PATHOPTS', 'PATHMODE', 'PATHDISP'].map(find).find(Boolean);
        if (option) {
            diagnostics.push(makeDiagnostic('JCLD007', { keyword: option.key }, { line: dd.line, column: option.col, severity: 'warning' }));
        }

        return;
    }

    const disp = find('DISP');
    if (disp) {
        diagnostics.push(makeDiagnostic('JCLD006', {}, { line: dd.line, column: disp.col }));
    }

    const opts = find('PATHOPTS');
    const modes = opts ? (opts.subvalues || [opts.value]).filter(o => ACCESS_MODES.includes(o.toUpperCase())) : [];
    if (modes.length > 1) {
        diagnostics.push(makeDiagnostic('JCLD005', { modes }, { line: dd.line, column: opts.valueCol }));
    }
}

const JOB_LINE_RE = /^\/\/\S*\s+JOB(\s|$)/i;

// A job carried as in-stream data and written to the internal reader is
// submitted on its own; say so, since its JCL isn't checked here.
function checkInternalReader(step, diagnostics) {
    const toIntrdr = step.dds.some(dd => dd.params.some(p => p.kind === 'keyword' && p.key === 'SYSOUT' &&
        p.subvalues && (p.subvalues[1] || '').toUpperCase() === 'INTRDR'));
    if (!toIntrdr) {
        return;
    }

    for (const dd of step.dds) {
        if (dd.instreamData && dd.instreamData.some(line => JOB_LINE_RE.test(line))) {
            diagnostics.push(makeDiagnostic('JCLD004', {}, { line: dd.line, column: 1, severity: 'info' }));
        }
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
