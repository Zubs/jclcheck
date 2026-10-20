// Site profile rules (JCLN002): naming patterns for jobs, steps and DDs,
// allowed values for keywords, and prefixes for new datasets.

const { makeDiagnostic } = require('../errors');
const { matches, asList } = require('../profile');

const KIND_LABEL = { job: 'Job', step: 'Step', dd: 'DD' };
const SYMBOLIC_RE = /(?<!&)&[A-Za-z$#@]/;

function unquote(value) {
    const m = value.match(/^'(.*)'$/);
    return m ? m[1].replace(/''/g, "'") : value;
}

function checkName(kind, name, line, profile, diagnostics) {
    const patterns = asList(profile.names && profile.names[kind]);
    if (!name || !patterns.length || SYMBOLIC_RE.test(name) || patterns.some(p => matches(p, name))) {
        return;
    }

    const quoted = patterns.map(p => `'${p}'`);
    const rule = `the site pattern${quoted.length > 1 ? 's' : ''} ${quoted.join(' or ')}`;
    diagnostics.push(makeDiagnostic('JCLN002', {
        message: `${KIND_LABEL[kind]} name ${name} doesn't match ${rule}.`,
        rule: 'names'
    }, { line, column: 3 }));
}

function checkValues(params, line, profile, diagnostics) {
    const allowed = new Map(Object.entries(profile.allowed || {}).map(([k, v]) => [k.toUpperCase(), asList(v).map(x => x.toUpperCase())]));
    for (const p of params) {
        const values = p.kind === 'keyword' && allowed.get(p.key);
        const value = values && unquote(p.value).toUpperCase();
        if (values && !SYMBOLIC_RE.test(value) && !values.includes(value)) {
            diagnostics.push(makeDiagnostic('JCLN002', {
                message: `${p.key}=${p.value} isn't one of the site's allowed values: ${values.join(', ')}.`,
                rule: 'allowed'
            }, { line: p.valueLine ?? line, column: p.valueCol }));
        }
    }
}

function checkPrefix(dd, profile, diagnostics) {
    const prefixes = asList(profile.dsnPrefixes).map(x => x.toUpperCase());
    const dsn = dd.params.find(p => p.kind === 'keyword' && (p.key === 'DSN' || p.key === 'DSNAME'));
    const disp = dd.params.find(p => p.kind === 'keyword' && p.key === 'DISP');
    const status = disp ? (disp.subvalues ? disp.subvalues[0] : disp.value) : 'NEW';
    if (!prefixes.length || !dsn || (status || 'NEW').trim().toUpperCase() !== 'NEW') {
        return;
    }

    const name = dsn.value.toUpperCase();
    if (/^['&*]/.test(name) || SYMBOLIC_RE.test(name)) {
        return;
    }

    const first = name.split(/[.(]/)[0];
    if (!prefixes.includes(first)) {
        diagnostics.push(makeDiagnostic('JCLN002', {
            message: `New dataset ${name} starts with ${first}, which isn't one of the site's prefixes: ${prefixes.join(', ')}.`,
            rule: 'dsnPrefixes'
        }, { line: dsn.valueLine ?? dd.line, column: dsn.valueCol }));
    }
}

function checkSteps(steps, profile, diagnostics) {
    for (const step of steps) {
        checkName('step', step.name, step.line, profile, diagnostics);
        checkValues(step.params, step.line, profile, diagnostics);
        for (const dd of step.dds) {
            // An override such as PS.OUT names the PROC's DD, already checked there.
            if (!(dd.name || '').includes('.')) {
                checkName('dd', dd.name, dd.line, profile, diagnostics);
            }

            checkValues(dd.params, dd.line, profile, diagnostics);
            checkPrefix(dd, profile, diagnostics);
        }
    }
}

/** Checks every job and PROC against the site profile. */
function checkProfile(jobs, procs, profile, diagnostics) {
    if (!profile) {
        return;
    }

    for (const job of jobs) {
        checkName('job', job.name, job.line, profile, diagnostics);
        checkValues(job.params, job.line, profile, diagnostics);
        checkSteps(job.steps, profile, diagnostics);
    }

    for (const proc of procs) {
        checkSteps(proc.steps, profile, diagnostics);
    }
}

module.exports = { checkProfile };
