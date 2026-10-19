// Inline suppressions, written as JCL comments so the job still runs as is:
//   //* JCLCHECK OFF-NEXT code[,code]  hides the codes on the next statement
//   //* JCLCHECK OFF code[,code]       hides them until ON or the end of the job
//   //* JCLCHECK ON code[,code]
// Codes must be named. A hidden diagnostic is still returned, with
// `suppressed: true`; JCLX001 and JCLX002 note unknown codes and
// suppressions that hid nothing.

const { CATALOG, makeDiagnostic } = require('./errors');
const { statementText } = require('./lexer');

const DIRECTIVE_RE = /^\/\/\*\s*JCLCHECK\s+(OFF-NEXT|OFF|ON)(?=\s|$)\s*(\S*)/i;

// The codes a directive names, each with its column.
function namedCodes(match) {
    const listStart = match.index + match[0].length - match[2].length;
    let offset = 0;
    return match[2].split(',').map(code => {
        const column = listStart + offset + 1;
        offset += code.length + 1;
        return { code: code.toUpperCase(), column };
    }).filter(c => c.code);
}

/**
 * Marks the diagnostics the source's suppressions hide, and adds JCLX notes.
 * `statements` are the source's own (before INCLUDE expansion); diagnostics
 * inside library members aren't affected.
 */
function applySuppressions(source, statements, diagnostics) {
    const lines = (source || '').replace(/\r/g, '').split('\n');
    const written = statements.filter(s => s.type !== 'COMMENT');
    const startsAt = new Map(written.map(s => [s.line, s]));
    const ranges = []; // { code, from, to, use }
    const uses = []; // { code, line, column, hid }
    const open = new Map();
    const notes = [];
    let inJob = false;

    const close = (code, to) => {
        open.get(code).to = to;
        open.delete(code);
    };

    lines.forEach((raw, index) => {
        const n = index + 1;
        const stmt = startsAt.get(n);
        if (stmt && (stmt.type === 'NULL' || (stmt.type === 'STMT' && stmt.op.toUpperCase() === 'JOB'))) {
            // A new JOB ends the blocks opened in the job before it; the null
            // statement (//) ends its own job.
            if (stmt.type === 'NULL' || inJob) {
                [...open.keys()].forEach(code => close(code, stmt.type === 'NULL' ? n : n - 1));
            }

            inJob = stmt.type === 'STMT';
        }

        const match = statementText(raw).match(DIRECTIVE_RE);
        if (!match) {
            return;
        }

        const kind = match[1].toUpperCase();
        const named = namedCodes(match);
        if (!named.length) {
            notes.push(makeDiagnostic('JCLX001', { code: null }, { line: n, column: 1 }));
            return;
        }

        const next = kind === 'OFF-NEXT' && written.find(s => s.line > n);
        for (const { code, column } of named) {
            if (!CATALOG[code]) {
                notes.push(makeDiagnostic('JCLX001', { code }, { line: n, column, length: code.length }));
                continue;
            }

            if (kind === 'ON') {
                if (open.has(code)) {
                    close(code, n);
                }

                continue;
            }

            const use = { code, line: n, column, hid: false };
            uses.push(use);
            if (kind === 'OFF-NEXT') {
                if (next) {
                    ranges.push({ code, from: next.line, to: next.endLine, use });
                }
            } else if (!open.has(code)) {
                const range = { code, from: n, to: Infinity, use };
                ranges.push(range);
                open.set(code, range);
            }
        }
    });

    for (const d of diagnostics) {
        const range = ranges.find(r => r.code === d.code && d.line >= r.from && d.line <= r.to);
        if (range) {
            d.suppressed = true;
            range.use.hid = true;
        }
    }

    for (const use of uses.filter(u => !u.hid)) {
        notes.push(makeDiagnostic('JCLX002', { code: use.code }, { line: use.line, column: use.column, length: use.code.length }));
    }

    diagnostics.push(...notes);
}

module.exports = { applySuppressions };
