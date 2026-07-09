const { makeDiagnostic } = require('../errors');
const {
    JOB_KEYWORDS,
    EXEC_KEYWORDS,
    DD_KEYWORDS,
    DISP_STATUS,
    DISP_NORMAL,
    DISP_ABNORMAL,
    RECFM_CODES,
    DSORG_CODES
} = require('../keywords');

const NAME_RE = /^[A-Za-z$#@][A-Za-z0-9$#@]{0,7}$/;

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) {
        dp[i][0] = i;
    }

    for (let j = 0; j <= n; j++) {
        dp[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
        }
    }

    return dp[m][n];
}

function closestKeyword(word, keywordSet) {
    let best = null, bestDist = Infinity;
    for (const k of keywordSet) {
        const d = levenshtein(word, k);
        if (d < bestDist) {
            bestDist = d;
            best = k;
        }
    }

    return bestDist <= 2 ? best : null;
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
            { line, column: 3}
        ));
    }
}

function checkKeywords(
    params,
    allowedSet,
    stmtLabel,
    line,
    diagnostics
) {
    let sawKeyword = false;
    for (const p of params) {
        if (p.kind === 'keyword') {
            sawKeyword = true;
            if (!allowedSet.has(p.key)) {
                const closest = closestKeyword(p.key, allowedSet);
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

function findParam(params, key) {
    return params.find(p => p.kind === 'keyword' && p.key === key);
}

function checkExecRequired(step, diagnostics) {
    const pgm = findParam(step.params, 'PGM');
    const proc = findParam(step.params, 'PROC');
    const positional = step.params.find(p => p.kind === 'positional');
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

function checkDsn(
    value,
    line,
    col,
    diagnostics
) {
    let v = value.trim();
    let generationRef = '';
    const genMatch = v.match(/\(([+-]?\d+)\)$/);
    if (genMatch) {
        v = v.slice(0, genMatch.index);
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
                { value, hint: `Empty qualifier (check for a stray or missing period).`},
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

function checkParamValues(
    params,
    line,
    diagnostics
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
                break;
        }
    }
}

function checkStepsAndDDs(steps, diagnostics) {
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
            execAllowed = new Set([...EXEC_KEYWORDS, ...symbolNames]);
        }

        checkKeywords(
            step.params,
            execAllowed,
            'EXEC',
            step.line,
            diagnostics
        );

        checkParamValues(
            step.params,
            step.line,
            diagnostics
        );

        checkExecRequired(step, diagnostics);

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
                diagnostics
            );

            checkParamValues(
                dd.params,
                dd.line,
                diagnostics
            );
        }
    }
}

function checkAllParams(job, diagnostics) {
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
        diagnostics
    );

    checkParamValues(
        job.params,
        job.line,
        diagnostics
    );

    checkStepsAndDDs(job.steps, diagnostics);
}

module.exports = {
    checkAllParams,
    checkStepsAndDDs,
    checkKeywords,
    checkParamValues,
    closestKeyword
};
