// Checks JES2 ("/*NAME ...") and JES3 ("//*NAME ...") control statements read
// by the lexer: known names, keywords, the /*ROUTE operand, and where each goes
// relative to the JOB and first EXEC statements. A shop runs one JES, so
// statements for the other one are pointed out rather than checked.

const { makeDiagnostic } = require('../errors');
const { JES2_STATEMENTS, JES3_STATEMENTS } = require('../keywords');
const { closestKeyword } = require('./paramRules');
const { tokenizeParams } = require('../paramTokenizer');

const ROUTE_TYPES = new Set(['PRINT', 'PUNCH', 'XEQ']);

function checkRoute(stmt, diagnostics) {
    const words = stmt.operand.split(/\s+/).filter(Boolean);
    if (words.length < 2 || !ROUTE_TYPES.has(words[0].toUpperCase())) {
        diagnostics.push(makeDiagnostic(
            'JCLJ002',
            { found: words[0] },
            { line: stmt.line, column: words.length ? stmt.operandCol : stmt.nameCol }
        ));
    }
}

function checkJes2(stmt, sawJob, diagnostics) {
    const entry = JES2_STATEMENTS.get(stmt.name);
    if (!entry) {
        diagnostics.push(makeDiagnostic(
            'JCLJ001',
            { name: stmt.name, closest: closestKeyword(stmt.name, JES2_STATEMENTS) },
            { line: stmt.line, column: stmt.nameCol }
        ));

        return;
    }

    if (stmt.name === 'ROUTE') {
        checkRoute(stmt, diagnostics);
    }

    const place = entry.place || 'after';
    if ((place === 'before' && sawJob) || (place === 'after' && !sawJob)) {
        diagnostics.push(makeDiagnostic(
            'JCLJ003',
            { name: stmt.name, before: place === 'before' },
            { line: stmt.line, column: 1 }
        ));
    }
}

function checkJes3(stmt, sawJob, sawExec, diagnostics) {
    const entry = JES3_STATEMENTS.get(stmt.name);
    if (entry.keywords) {
        for (const p of tokenizeParams(stmt.operand, stmt.operandCol).params) {
            if (p.kind === 'keyword' && !entry.keywords.has(p.key)) {
                diagnostics.push(makeDiagnostic(
                    'JCLJ302',
                    { keyword: p.key, name: stmt.name, closest: closestKeyword(p.key, entry.keywords) },
                    { line: stmt.line, column: p.col }
                ));
            }
        }
    }

    const place = entry.place || 'afterJob';
    const misplaced = place === 'before' ? sawJob : !sawJob || (place === 'beforeExec' && sawExec);
    if (misplaced) {
        diagnostics.push(makeDiagnostic('JCLJ303', { name: stmt.name, place }, { line: stmt.line, column: 1 }));
    }

    if (stmt.unclosed) {
        diagnostics.push(makeDiagnostic('JCLJ304', {}, { line: stmt.line, column: 1 }));
    }
}

// A "//*" comment that is close to a JES3 statement name and has keyword
// operands is probably a misspelt statement; with JES2, a real JES3 name is
// worth a note, since it's silently a comment there.
function checkComment(stmt, jes, diagnostics) {
    const m = stmt.text.match(/^\*([A-Za-z]+)( +(.*))?$/);
    if (!m) {
        return;
    }

    const name = m[1].toUpperCase();
    if (jes === 'JES2' && JES3_STATEMENTS.has(name)) {
        diagnostics.push(makeDiagnostic('JCLJ306', { name }, { line: stmt.line, column: 1, severity: 'info' }));
    } else if (jes === 'JES3' && (m[3] || '').includes('=')) {
        const closest = closestKeyword(name, JES3_STATEMENTS);
        if (closest) {
            diagnostics.push(makeDiagnostic('JCLJ301', { name, closest }, { line: stmt.line, column: 4 }));
        }
    }
}

function checkJesStatements(statements, diagnostics, { jes = 'JES2' } = {}) {
    let sawJob = false;
    let sawExec = false;
    for (const stmt of statements) {
        if (stmt.type === 'STMT') {
            const op = (stmt.op || '').toUpperCase();
            sawJob = sawJob || op === 'JOB';
            sawExec = sawExec || (sawJob && op === 'EXEC');
        } else if (stmt.type === 'COMMENT') {
            checkComment(stmt, jes, diagnostics);
        } else if (stmt.type === 'JES2' && stmt.name !== '$') {
            if (jes === 'JES3' && stmt.name !== 'SIGNON' && stmt.name !== 'SIGNOFF') {
                diagnostics.push(makeDiagnostic('JCLJ305', { name: stmt.name }, { line: stmt.line, column: 1 }));
            } else if (jes === 'JES2') {
                checkJes2(stmt, sawJob, diagnostics);
            }
        } else if (stmt.type === 'JES3' && stmt.name !== '*') {
            checkJes3(stmt, sawJob, sawExec, diagnostics);
        }
    }
}

module.exports = { checkJesStatements };
