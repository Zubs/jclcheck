// Catalogued procedures and INCLUDE members supplied by the user, found in a
// job's JCLLIB search order.
//
// Each member that gets read has its statements moved to a line range of its
// own (member n starts at (n + 1) * LINE_BASE), so the parser and every rule
// work on them unchanged. locate() maps a diagnostic in such a range back to
// the member and the line within it.

const { lex } = require('./lexer');
const { makeDiagnostic } = require('./errors');
const { tokenizeParams } = require('./paramTokenizer');

const LINE_BASE = 1000000;
const MAX_INCLUDE_DEPTH = 15;
const NOT_IN_INCLUDE = new Set(['JOB', 'PROC', 'PEND', 'JCLLIB']);

function labelOf(entry) {
    const member = entry.member.toUpperCase();
    return entry.dsn ? `${entry.dsn.toUpperCase()}(${member})` : member;
}

function orderOf(params) {
    const order = params.find(p => p.kind === 'keyword' && p.key === 'ORDER');
    return order ? (order.subvalues || [order.value]).map(lib => lib.toUpperCase()) : [];
}

function createLibrary(entries = [], context = {}) {
    const labels = [];
    const cache = new Map();

    // JCLLIB libraries first, in order, then members with no library.
    function find(name, order = []) {
        const member = (name || '').toUpperCase();
        for (const lib of order) {
            const entry = entries.find(e => e.dsn && e.dsn.toUpperCase() === lib && e.member.toUpperCase() === member);
            if (entry) {
                return entry;
            }
        }

        return entries.find(e => !e.dsn && e.member.toUpperCase() === member) || null;
    }

    // The member's statements in its own line range; its lexer diagnostics are
    // added the first time it is read.
    function read(entry, diagnostics) {
        if (!cache.has(entry)) {
            labels.push(labelOf(entry));
            const base = labels.length * LINE_BASE;
            const { statements, diagnostics: lexDiags } = lex(entry.source || '', context);
            for (const stmt of statements) {
                stmt.line += base;
                stmt.endLine += base;
                if (stmt.instreamEndLine) {
                    stmt.instreamEndLine += base;
                }
            }

            for (const d of lexDiags) {
                d.line += base;
            }

            diagnostics.push(...lexDiags);
            cache.set(entry, statements);
        }

        return cache.get(entry);
    }

    function locate(d) {
        if (d.line >= LINE_BASE) {
            d.member = labels[Math.floor(d.line / LINE_BASE) - 1];
            d.line %= LINE_BASE;
        }

        return d;
    }

    return { find, read, locate, labelOf };
}

/**
 * Replaces each INCLUDE MEMBER=name with the member's statements, searching
 * the latest JCLLIB's libraries. `chain` is the members being included.
 */
function expandIncludes(statements, library, diagnostics, chain = [], startOrder = [], reportedLoops = new Set()) {
    const out = [];
    let order = startOrder;
    for (const stmt of statements) {
        const op = stmt.type === 'STMT' ? (stmt.op || '').toUpperCase() : '';
        if (op === 'JOB') {
            order = [];
        } else if (op === 'JCLLIB') {
            order = orderOf(tokenizeParams(stmt.operand).params);
        }

        if (op !== 'INCLUDE') {
            out.push(stmt);
            continue;
        }

        const memberParam = tokenizeParams(stmt.operand).params.find(p => p.kind === 'keyword' && p.key === 'MEMBER');
        const entry = memberParam && library.find(memberParam.value, order);
        if (!entry) {
            if (memberParam) {
                diagnostics.push(makeDiagnostic('JCLR005', { name: memberParam.value }, { line: stmt.line, column: memberParam.valueCol, severity: 'warning' }));
            }

            out.push(stmt);
            continue;
        }

        const label = library.labelOf(entry);
        if (chain.includes(label)) {
            if (!reportedLoops.has(label)) {
                reportedLoops.add(label);
                diagnostics.push(makeDiagnostic('JCLR006', { name: label, chain: [...chain, label] }, { line: stmt.line, column: memberParam.valueCol }));
            }

            continue;
        }

        if (chain.length >= MAX_INCLUDE_DEPTH) {
            diagnostics.push(makeDiagnostic('JCLR007', { max: MAX_INCLUDE_DEPTH }, { line: stmt.line, column: memberParam.valueCol }));
            continue;
        }

        const memberStmts = library.read(entry, diagnostics).filter(ms => {
            const memberOp = ms.type === 'STMT' ? (ms.op || '').toUpperCase() : '';
            if (NOT_IN_INCLUDE.has(memberOp)) {
                diagnostics.push(makeDiagnostic('JCLR008', { op: memberOp }, { line: ms.line, column: ms.opCol }));
                return false;
            }

            return true;
        });
        out.push(...expandIncludes(memberStmts, library, diagnostics, [...chain, label], order, reportedLoops));
    }

    return out;
}

module.exports = {
    LINE_BASE,
    MAX_INCLUDE_DEPTH,
    createLibrary,
    expandIncludes,
    orderOf
};
