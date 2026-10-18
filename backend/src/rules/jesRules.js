// Checks JES2 control statements ("/*NAME ...") read by the lexer: known
// names, the /*ROUTE operand, and where each goes relative to the JOB statement.

const { makeDiagnostic } = require('../errors');
const { JES2_STATEMENTS } = require('../keywords');
const { closestKeyword } = require('./paramRules');

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

function checkJesStatements(statements, diagnostics) {
    let sawJob = false;
    for (const stmt of statements) {
        if (stmt.type === 'STMT' && (stmt.op || '').toUpperCase() === 'JOB') {
            sawJob = true;
        }

        if (stmt.type !== 'JES2' || stmt.name === '$') {
            continue;
        }

        const entry = JES2_STATEMENTS.get(stmt.name);
        if (!entry) {
            diagnostics.push(makeDiagnostic(
                'JCLJ001',
                { name: stmt.name, closest: closestKeyword(stmt.name, JES2_STATEMENTS) },
                { line: stmt.line, column: stmt.nameCol }
            ));

            continue;
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
}

module.exports = { checkJesStatements };
