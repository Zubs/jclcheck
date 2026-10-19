const { makeDiagnostic } = require('../errors');
const {
    JOB_KEYWORDS,
    EXEC_KEYWORDS,
    DD_KEYWORDS,
    JCLLIB_KEYWORDS,
    NOTIFY_KEYWORDS,
    POSITIONAL_LIMITS,
    QUALIFIABLE_KEYWORDS,
    DISP_STATUS,
    DISP_NORMAL,
    DISP_ABNORMAL,
    RECFM_CODES,
    DSORG_CODES
} = require('../keywords');
const { availability, DEFAULT_ZOS_LEVEL } = require('../levels');
const { closest, checkValue } = require('../valueRules');
const { parseCondition, conditionChars } = require('../conditions');

const NAME_RE = /^[A-Za-z$#@][A-Za-z0-9$#@]{0,7}$/;

function closestKeyword(word, keywordTable) {
    return closest(word, keywordTable.keys());
}

function checkName(
    name,
    stmtLabel,
    line,
    diagnostics,
    required = false
) {
    if (!name) {
        return;
    }

    if (stmtLabel === 'DD' && name.includes('.')) {
        return;
    } // stepname.ddname override reference

    if (!NAME_RE.test(name)) {
        diagnostics.push(makeDiagnostic(
            'JCLN001',
            { name, stmt: stmtLabel },
            { line, column: 3 }
        ));
    }
}

function checkKeywords(
    params,
    allowedTable,
    stmtLabel,
    line,
    diagnostics,
    zosLevel = DEFAULT_ZOS_LEVEL
) {
    let sawKeyword = false;
    for (const p of params) {
        if (p.kind === 'keyword') {
            sawKeyword = true;
            if (!allowedTable.has(p.key)) {
                const closest = closestKeyword(p.key, allowedTable);
                diagnostics.push(makeDiagnostic(
                    'JCLK001',
                    {
                        keyword: p.key,
                        stmt: stmtLabel,
                        closest
                    }, {
                        line,
                        column: p.col
                    }));
            } else {
                const missing = availability(allowedTable.get(p.key), zosLevel);
                if (missing) {
                    diagnostics.push(makeDiagnostic(
                        'JCLK005',
                        {
                            kind: 'keyword',
                            name: p.key,
                            stmt: stmtLabel,
                            level: zosLevel,
                            ...missing
                        }, {
                            line,
                            column: p.col
                        }));
                }
            }
        } else if (p.kind === 'positional') {
            if (sawKeyword) {
                diagnostics.push(makeDiagnostic(
                    'JCLK003',
                    { value: p.value },
                    { line, column: p.col }
                ));
            }
        }
    }
}

const POSITIONAL_MEANING = {
    JOB: "accounting information and programmer's name",
    EXEC: 'procedure name',
    DD: '*, DATA, DUMMY or DYNAM'
};

// Positional parameters before the first keyword; later ones are JCLK003.
function leadingPositionals(params) {
    const first = params.findIndex(p => p.kind === 'keyword');
    return (first === -1 ? params : params.slice(0, first)).filter(p => p.kind === 'positional');
}

function checkPositionalLimit(params, stmt, line, diagnostics) {
    const positionals = leadingPositionals(params);
    const limit = POSITIONAL_LIMITS[stmt];
    if (positionals.length > limit) {
        diagnostics.push(makeDiagnostic(
            'JCLK004',
            { stmt, limit, found: positionals.length, what: POSITIONAL_MEANING[stmt] },
            { line, column: positionals[limit].col, severity: 'error' }
        ));
    }
}

const MAX_ACCOUNTING = 143;
const MAX_PROGRAMMER_NAME = 20;

function checkJobPositionals(job, diagnostics) {
    const [accounting, name] = leadingPositionals(job.params);
    if (accounting && !accounting.empty) {
        const inner = /^\(.*\)$/.test(accounting.value) ? accounting.value.slice(1, -1) : accounting.value;
        if (inner.length > MAX_ACCOUNTING) {
            diagnostics.push(makeDiagnostic(
                'JCLS012',
                { what: 'accounting information', length: inner.length, max: MAX_ACCOUNTING },
                { line: job.line, column: accounting.col }
            ));
        }
    }

    if (!name || name.empty) {
        return;
    }

    const quoted = name.value.match(/^'(.*)'$/);
    const text = quoted ? quoted[1].replace(/''/g, "'") : name.value;
    if (text.length > MAX_PROGRAMMER_NAME) {
        diagnostics.push(makeDiagnostic(
            'JCLS012',
            { what: "programmer's name", length: text.length, max: MAX_PROGRAMMER_NAME },
            { line: job.line, column: name.col }
        ));
    }

    if (!quoted && /[^A-Za-z0-9$#@.-]/.test(text)) {
        diagnostics.push(makeDiagnostic('JCLS013', { value: text }, { line: job.line, column: name.col }));
    }
}

function findParam(params, key) {
    return params.find(p => p.kind === 'keyword' && p.key === key);
}

function checkExecRequired(step, diagnostics) {
    const pgm = findParam(step.params, 'PGM');
    const proc = findParam(step.params, 'PROC');
    const positional = step.params.find(p => p.kind === 'positional' && !p.empty);
    if (!pgm && !proc && !positional) {
        diagnostics.push(makeDiagnostic(
            'JCLK002',
            {
                stmt: 'EXEC',
                param: 'PGM or PROC',
                hint: `Add PGM=program-name to run a program, or PROC=proc-name (or a positional proc name) to invoke a procedure.`
            },
            { line: step.line, column: 1 }
        ));
    }
}

function checkDisp(
    value,
    line,
    col,
    diagnostics
) {
    let subs;
    if (value.startsWith('(')) {
        subs = value.slice(1, -1).split(',').map(s => s.trim());
    } else {
        subs = [value.trim()];
    }

    const status = subs[0];
    const normal = subs[1];
    const abnormal = subs[2];
    let ok = true;
    if (status && !DISP_STATUS.has(status.toUpperCase())) {
        ok = false;
    }

    if (normal && !DISP_NORMAL.has(normal.toUpperCase())) {
        ok = false;
    }

    if (abnormal && !DISP_ABNORMAL.has(abnormal.toUpperCase())) {
        ok = false;
    }

    if (subs.length > 3) {
        ok = false;
    }

    if (!ok) {
        diagnostics.push(makeDiagnostic(
            'JCLS001',
            { value, pass: true },
            { line, column: col }
        ));
    }
}

function checkSpace(
    value,
    line,
    col,
    diagnostics
) {
    // SPACE=(unit,(primary,secondary,directory),RLSE,ROUND,CONTIG)
    const m = value.match(/^\(([^,]+),\s*\(([^)]*)\)/);
    if (!m) {
        // Also allow SPACE=(unit,(primary))
        const m2 = value.match(/^\(([^,]+),\s*(\d+)\)/);
        if (!m2) {
            diagnostics.push(makeDiagnostic(
                'JCLS002',
                { value },
                { line, column: col }
            ));

            return;
        }

        return;
    }

    const unit = m[1].trim();
    const isNumericBlock = /^\d+$/.test(unit);
    if (unit.toUpperCase() !== 'TRK' && unit.toUpperCase() !== 'CYL' && !isNumericBlock) {
        diagnostics.push(makeDiagnostic(
            'JCLS002',
            { value },
            { line, column: col }
        ));

        return;
    }

    const quantities = m[2].split(',').map(s => s.trim());
    if (quantities.length === 0 || !/^\d+$/.test(quantities[0])) {
        diagnostics.push(makeDiagnostic(
            'JCLS002',
            { value },
            { line, column: col }
        ));
    }
}

function checkDcb(
    value,
    line,
    col,
    diagnostics
) {
    const subs = value.startsWith('(') ? value.slice(1, -1).split(',').map(s => s.trim()) : [value.trim()];
    for (const s of subs) {
        const m = s.match(/^([A-Z]+)=(.+)$/i);
        if (!m) {
            // could be a referback like DCB=*.STEP1.DD1 - skip those
            if (s.startsWith('*.') || s === '') {
                continue;
            }

            diagnostics.push(makeDiagnostic(
                'JCLS003',
                { value: s },
                { line, column: col }
            ));

            continue;
        }

        const key = m[1].toUpperCase();
        const val = m[2];
        if (key === 'RECFM') {
            if (!RECFM_CODES.has(val.toUpperCase())) {
                diagnostics.push(makeDiagnostic(
                    'JCLS003',
                    { value: s },
                    { line, column: col }
                ));
            }
        } else if (key === 'DSORG') {
            if (!DSORG_CODES.has(val.toUpperCase())) {
                diagnostics.push(makeDiagnostic(
                    'JCLS003',
                    { value: s },
                    { line, column: col }
                ));
            }
        } else if (key === 'LRECL' || key === 'BLKSIZE') {
            if (!/^\d+$/.test(val)) {
                diagnostics.push(makeDiagnostic(
                    'JCLS003',
                    { value: s },
                    { line, column: col }
                ));
            }
        }
    }
}

function checkRegion(
    value,
    line,
    col,
    diagnostics
) {
    if (!/^\d+[KM]$/i.test(value.trim())) {
        diagnostics.push(makeDiagnostic(
            'JCLS004',
            { value },
            { line, column: col }
        ));
    }
}

function checkTime(
    value,
    line,
    col,
    diagnostics
) {
    const v = value.trim().toUpperCase();
    if (v === 'NOLIMIT' || v === '1440') {
        return;
    }

    if (/^\d+$/.test(v)) {
        return;
    } // minutes only

    const m = v.match(/^\((\d*),(\d*)\)$/);
    if (m) {
        if (m[1] === '' && m[2] === '') {
            diagnostics.push(makeDiagnostic(
                'JCLS005',
                { value },
                { line, column: col }
            ));
        }

        return;
    }

    diagnostics.push(makeDiagnostic(
        'JCLS005',
        { value },
        { line, column: col }
    ));
}

const MEMBER_RE = /^[A-Za-z$#@][A-Za-z0-9$#@]{0,7}$/;

function checkDsn(
    value,
    line,
    col,
    diagnostics
) {
    let v = value.trim();
    if (/^'.*'$/.test(v)) {
        // The reference lets a quoted name break the usual rules.
        diagnostics.push(makeDiagnostic('JCLS014', { value }, { line, column: col, severity: 'info' }));
        return;
    }

    // A trailing (...) is a generation (0, +n, -n) or a member name.
    // (A missing ")" is matched too, so it is reported rather than ignored.)
    const paren = v.match(/\(([^()]*)\)?$/);
    if (paren) {
        const inside = paren[1];
        v = v.slice(0, paren.index);
        const symbolic = inside.includes('&');
        if (!symbolic && !/^[+-]?\d+$/.test(inside) && (!paren[0].endsWith(')') || !MEMBER_RE.test(inside))) {
            diagnostics.push(makeDiagnostic('JCLS010', { member: inside }, { line, column: col }));
        }
    }

    if (v.startsWith('&&')) {
        if (!MEMBER_RE.test(v.slice(2))) {
            diagnostics.push(makeDiagnostic(
                'JCLS006',
                { value, hint: `A temporary dataset name is && followed by 1-8 letters, digits or $#@, starting with a letter or $#@ (for example &&TEMP).` },
                { line, column: col }
            ));
        }

        return;
    }

    if (v.startsWith('&')) {
        return;
    } // symbolic parameter - can't statically validate

    if (v.startsWith('*.')) {
        return;
    } // referback - validated elsewhere structurally

    if (v.length > 44) {
        diagnostics.push(makeDiagnostic(
            'JCLS006',
            { value, hint: `This name is ${v.length} characters; the maximum is 44.` },
            { line, column: col }
        ));

        return;
    }

    const quals = v.split('.');
    if (quals.length > 22) {
        diagnostics.push(makeDiagnostic(
            'JCLS006',
            { value, hint: `This name has ${quals.length} qualifiers; the maximum is 22.` },
            { line, column: col }
        ));

        return;
    }

    for (const q of quals) {
        if (q.length === 0) {
            diagnostics.push(makeDiagnostic(
                'JCLS006',
                { value, hint: `Empty qualifier (check for a stray or missing period).` },
                { line, column: col }
            ));

            continue;
        }

        if (q.length > 8) {
            diagnostics.push(makeDiagnostic(
                'JCLS007',
                { qual: q },
                { line, column: col }
            ));

            continue;
        }

        if (!/^[A-Za-z$#@][A-Za-z0-9$#@-]*$/.test(q)) {
            diagnostics.push(makeDiagnostic(
                'JCLS008',
                { qual: q },
                { line, column: col }
            ));
        }
    }
}

// Reports a value that breaks the rule its keyword carries in `keywordTable`.
// Symbolic values and referbacks can't be known until the job runs.
function checkRuleValue(p, keywordTable, line, diagnostics) {
    const entry = keywordTable && keywordTable.get(p.key);
    const symbolic = !entry || (!entry.checkSymbols && p.value.includes('&'));
    if (!entry || !entry.value || symbolic || p.value.startsWith('*.')) {
        return;
    }

    const problem = checkValue(entry.value, p.value);
    if (problem) {
        diagnostics.push(makeDiagnostic(
            'JCLS009',
            { keyword: p.key, ...problem },
            { line, column: p.valueCol }
        ));
    }
}

function checkParamValues(
    params,
    line,
    diagnostics,
    keywordTable
) {
    for (const p of params) {
        if (p.kind !== 'keyword') {
            continue;
        }

        switch (p.key) {
            case 'DISP':
                checkDisp(
                    p.value,
                    line,
                    p.valueCol,
                    diagnostics
                );

                break;
            case 'SPACE':
                checkSpace(
                    p.value,
                    line,
                    p.valueCol,
                    diagnostics
                );

                break;
            case 'DCB':
                checkDcb(
                    p.value,
                    line,
                    p.valueCol,
                    diagnostics
                );

                break;
            case 'REGION':
                checkRegion(
                    p.value,
                    line,
                    p.valueCol,
                    diagnostics
                );

                break;
            case 'TIME':
                checkTime(
                    p.value,
                    line,
                    p.valueCol,
                    diagnostics
                );

                break;
            case 'LIKE':
                if (/\)$/.test(p.value.trim())) {
                    diagnostics.push(makeDiagnostic(
                        'JCLS006',
                        { value: p.value, hint: `LIKE names a model dataset, without a member or generation.` },
                        { line, column: p.valueCol }
                    ));
                } else {
                    checkDsn(p.value, line, p.valueCol, diagnostics);
                }

                break;
            case 'DSN':
            case 'DSNAME':
                checkDsn(
                    p.value,
                    line,
                    p.valueCol,
                    diagnostics
                );

                break;
            case 'RECFM':
                if (!RECFM_CODES.has(p.value.toUpperCase())) {
                    diagnostics.push(makeDiagnostic(
                        'JCLS003',
                        { value: p.value },
                        { line, column: p.valueCol }
                    ));
                }

                break;
            case 'DSORG':
                if (!DSORG_CODES.has(p.value.toUpperCase())) {
                    diagnostics.push(makeDiagnostic(
                        'JCLS003',
                        { value: p.value },
                        { line, column: p.valueCol }
                    ));
                }

                break;
            default:
                checkRuleValue(p, keywordTable, line, diagnostics);
                break;
        }
    }
}

function checkProcstepKeywords(step, params, diagnostics) {
    for (const p of params.filter(q => q.procstep !== undefined)) {
        const at = { line: step.line, column: p.col };
        if (step.pgm) {
            diagnostics.push(makeDiagnostic('JCLK009', { keyword: p.key, procstep: p.procstep }, { ...at, severity: 'error' }));
            continue;
        }

        if (EXEC_KEYWORDS.has(p.key) && !QUALIFIABLE_KEYWORDS.has(p.key)) {
            diagnostics.push(makeDiagnostic('JCLK008', { keyword: p.key }, at));
            continue;
        }

        if (!NAME_RE.test(p.procstep)) {
            diagnostics.push(makeDiagnostic('JCLN001', { name: p.procstep, stmt: 'procedure step' }, at));
            continue;
        }

        const proc = step.resolvedProc;
        if (proc && !proc.steps.some(s => (s.name || '').toUpperCase() === p.procstep.toUpperCase())) {
            const steps = proc.steps.map(s => s.name).filter(Boolean);
            diagnostics.push(makeDiagnostic('JCLR004', { proc: proc.name, procstep: p.procstep, steps }, at));
        }
    }
}

function checkStepsAndDDs(steps, diagnostics, { zosLevel } = {}) {
    for (const step of steps) {
        checkName(
            step.name,
            'EXEC',
            step.line,
            diagnostics
        );

        let execAllowed = EXEC_KEYWORDS;
        if (step.resolvedProc) {
            const symbolNames = new Set(step.resolvedProc.params.filter(p => p.kind === 'keyword').map(p => p.key));
            execAllowed = new Map([...EXEC_KEYWORDS, ...[...symbolNames].map(name => [name, {}])]);
        }

        // keyword.procstep=value is checked as keyword=value.
        const params = step.params.map(p => (p.kind === 'keyword' && p.key.includes('.')
            ? { ...p, key: p.key.slice(0, p.key.indexOf('.')), procstep: p.key.slice(p.key.indexOf('.') + 1) }
            : p));
        checkKeywords(
            params,
            execAllowed,
            'EXEC',
            step.line,
            diagnostics,
            zosLevel
        );

        checkParamValues(
            params,
            step.line,
            diagnostics,
            EXEC_KEYWORDS
        );

        checkProcstepKeywords(step, params, diagnostics);

        checkExecRequired(step, diagnostics);
        checkPositionalLimit(step.params, 'EXEC', step.line, diagnostics);

        for (const dd of step.dds) {
            checkName(
                dd.name,
                'DD',
                dd.line,
                diagnostics
            );

            checkKeywords(
                dd.params,
                DD_KEYWORDS,
                'DD',
                dd.line,
                diagnostics,
                zosLevel
            );

            checkParamValues(
                dd.params,
                dd.line,
                diagnostics,
                DD_KEYWORDS
            );

            checkPositionalLimit(dd.params, 'DD', dd.line, diagnostics);
        }
    }
}

function checkJcllib(jcllib, diagnostics, zosLevel) {
    checkKeywords(jcllib.params, JCLLIB_KEYWORDS, 'JCLLIB', jcllib.line, diagnostics, zosLevel);
    const order = findParam(jcllib.params, 'ORDER');
    if (!order) {
        diagnostics.push(makeDiagnostic(
            'JCLK002',
            { stmt: 'JCLLIB', param: 'ORDER', hint: `Add ORDER=(library,...) listing the libraries to search for procedures and INCLUDE members.` },
            { line: jcllib.line, column: 1 }
        ));

        return;
    }

    for (const library of order.subvalues || [order.value]) {
        checkDsn(library, jcllib.line, order.valueCol, diagnostics);
    }
}

function checkNotify(notify, diagnostics, zosLevel) {
    checkKeywords(notify.params, NOTIFY_KEYWORDS, 'NOTIFY', notify.line, diagnostics, zosLevel);
    checkParamValues(notify.params, notify.line, diagnostics, NOTIFY_KEYWORDS);
    const email = findParam(notify.params, 'EMAIL');
    const user = findParam(notify.params, 'USER');
    if (!email && !user) {
        diagnostics.push(makeDiagnostic(
            'JCLK002',
            { stmt: 'NOTIFY', param: 'EMAIL or USER', hint: `Add EMAIL='address' or USER=userid to say who is notified.` },
            { line: notify.line, column: 1 }
        ));
    } else if (email && user) {
        diagnostics.push(makeDiagnostic('JCLK007', {}, { line: notify.line, column: user.col, severity: 'error' }));
    }

    checkWhen(findParam(notify.params, 'WHEN'), notify.line, diagnostics);
}

// WHEN=(condition) or WHEN='condition': the IF condition syntax, without THEN.
function checkWhen(when, line, diagnostics) {
    if (!when) {
        return;
    }

    const inner = when.value.match(/^(\(|')(.*)(\)|')$/);
    if (!inner) {
        diagnostics.push(makeDiagnostic('JCLC001', { detail: 'WHEN must be a condition in brackets or quotes, for example WHEN=(RC>4).' }, { line, column: when.valueCol }));
        return;
    }

    const chars = conditionChars(inner[2], line, when.valueCol + 1);
    for (const e of parseCondition(chars, { line, col: when.valueCol }, { requireThen: false }).errors) {
        diagnostics.push(makeDiagnostic(e.code, e.data, { line: e.line, column: e.col }));
    }
}

function checkAllParams(job, diagnostics, { zosLevel } = {}) {
    if (!job) {
        return;
    }

    checkName(
        job.name,
        'JOB',
        job.line,
        diagnostics
    );

    checkKeywords(
        job.params,
        JOB_KEYWORDS,
        'JOB',
        job.line,
        diagnostics,
        zosLevel
    );

    checkParamValues(
        job.params,
        job.line,
        diagnostics,
        JOB_KEYWORDS
    );

    checkPositionalLimit(job.params, 'JOB', job.line, diagnostics);
    checkJobPositionals(job, diagnostics);

    if (job.jcllib) {
        checkJcllib(job.jcllib, diagnostics, zosLevel);
    }

    for (const notify of job.notifies) {
        checkNotify(notify, diagnostics, zosLevel);
    }

    checkStepsAndDDs(job.steps, diagnostics, { zosLevel });
}

module.exports = {
    checkAllParams,
    checkStepsAndDDs,
    checkKeywords,
    checkParamValues,
    checkRuleValue,
    checkWhen,
    checkName,
    checkDsn,
    MEMBER_RE,
    closestKeyword
};
