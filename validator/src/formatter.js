// Lays out JCL in the usual columns: name in column 3, operation in 12,
// continued operands in 16, and no statement text past column 71. Comments,
// in-stream data, JES statements, IF conditions and statements with sequence
// numbers are left as written. The result is checked against the input and
// refused if it would mean anything different.

const { lex } = require('./lexer');
const { validate } = require('./validator');
const { tokenizeParams, splitTopLevel } = require('./paramTokenizer');

const LAST_COLUMN = 71;
const OP_COLUMN = 12;
const CONTINUE_COLUMN = 16;
const CONTINUE_PREFIX = `//${' '.repeat(CONTINUE_COLUMN - 3)}`;
const LEFT_ALONE = new Set(['IF', 'ELSE', 'ENDIF']);

// Columns 73-80 holding a sequence number, with column 72 blank.
function hasSequenceNumber(line) {
    return line.length > 72 && line[71] === ' ' && line.slice(72, 80).trim() !== '' && line.length <= 80;
}

// Where the operand starts on a statement's first line, or on a continuation.
function operandStart(line, first) {
    let i = 2;
    if (first) {
        while (i < line.length && line[i] !== ' ') {
            i++;
        }

        while (line[i] === ' ') {
            i++;
        }

        while (i < line.length && line[i] !== ' ') {
            i++;
        }
    }

    while (line[i] === ' ') {
        i++;
    }

    return i;
}

// The last comma in the operand at or before column 71 that is outside
// quotes, or -1. The operand ends at a blank outside quotes.
function breakPoint(line, start, startInQuote = false) {
    let inQuote = startInQuote;
    let best = -1;
    for (let i = start; i < line.length; i++) {
        const ch = line[i];
        if (ch === "'") {
            inQuote = !inQuote;
        } else if (!inQuote && ch === ' ') {
            return i > LAST_COLUMN ? best : -1;
        } else if (!inQuote && ch === ',' && i < LAST_COLUMN) {
            best = i;
        }
    }

    return best;
}

// Whether a break before index `end` falls inside a quoted string, and not
// just after a quote (which could be read as half of '').
function insideQuotes(text, start, end, startInQuote = false) {
    let inQuote = startInQuote;
    for (let i = start; i < end; i++) {
        if (text[i] === "'") {
            inQuote = !inQuote;
        } else if (!inQuote && text[i] === ' ') {
            return false;
        }
    }

    return inQuote && text[end - 1] !== "'";
}

/**
 * A statement line whose operand runs past column 71 is read in full (z/OS
 * would ignore columns 72-80, but the user meant all of it), by breaking it
 * after a comma. Returns the lines, each with the original line it came from
 * and whether it changed.
 */
function unwrapOverflow(lines, statements) {
    const out = lines.map((text, i) => ({ text, from: i, changed: false }));
    const firstLines = new Map(statements.filter(s => s.type === 'STMT').map(s => [s.line, s]));
    const owner = new Map();
    for (const s of firstLines.values()) {
        for (let n = s.line; n <= s.endLine; n++) {
            owner.set(n, s);
        }
    }

    const result = [];
    for (const entry of out) {
        const n = entry.from + 1;
        const stmt = owner.get(n);
        let text = entry.text;
        if (!stmt || LEFT_ALONE.has(stmt.op.toUpperCase()) || text.length <= LAST_COLUMN || hasSequenceNumber(text)) {
            result.push(entry);
            continue;
        }

        let first = stmt.line === n;
        let changed = false;
        let quoteOpen = false;
        while (text.length > LAST_COLUMN) {
            const start = operandStart(text, first);
            const at = breakPoint(text, start, quoteOpen);
            if (at !== -1) {
                quoteOpen = false;
                result.push({ text: text.slice(0, at + 1), from: entry.from, changed: true });
                text = CONTINUE_PREFIX + text.slice(at + 1).trimStart();
            } else if (insideQuotes(text, start, LAST_COLUMN, quoteOpen)) {
                quoteOpen = true;
                // A quoted string runs to column 71 and resumes in column 16.
                result.push({ text: text.slice(0, LAST_COLUMN), from: entry.from, changed: true });
                text = CONTINUE_PREFIX + text.slice(LAST_COLUMN);
            } else {
                break;
            }

            first = false;
            changed = true;
        }

        result.push({ text, from: entry.from, changed: changed || entry.changed });
    }

    return result;
}

// The name in column 3 and the operation in column 12 (or one blank after a
// name that is too long).
function firstLine(name, op) {
    return `//${name.padEnd(OP_COLUMN - 4)} ${op}`;
}

// Splits a token with a quoted string over lines, each running to column 71
// and resuming in column 16, as z/OS continues a quoted string. Returns the
// pieces, or null when the breaks wouldn't fall inside the quotes.
function splitQuoted(token, startColumn) {
    const pieces = [];
    let rest = token;
    let offset = 0;
    let room = LAST_COLUMN - startColumn + 1;
    while (rest.length > room) {
        let inQuote = false;
        for (let i = 0; i < offset + room; i++) {
            if (token[i] === "'") {
                inQuote = !inQuote;
            }
        }

        // A break just after a quote could be read as the first half of ''.
        if (!inQuote || token[offset + room - 1] === "'") {
            return null;
        }

        pieces.push(rest.slice(0, room));
        rest = rest.slice(room);
        offset += room;
        room = LAST_COLUMN - CONTINUE_COLUMN + 1;
    }

    pieces.push(rest);
    return pieces;
}

/** The statement's new lines, or a reason it is left as it is. */
function layout(stmt) {
    const op = stmt.op.toUpperCase();
    const name = (stmt.name || '').toUpperCase();
    const head = firstLine(name, op);
    if (!stmt.operand) {
        return { lines: [stmt.comment ? `${head} ${stmt.comment}` : head] };
    }

    if (tokenizeParams(stmt.operand).errors.length) {
        return { reason: 'it has an unmatched parenthesis' };
    }

    const tokens = splitTopLevel(stmt.operand).map(({ text }) => {
        const eq = text.indexOf('=');
        const key = eq > 0 ? text.slice(0, eq) : '';
        return key && !/['(&]/.test(key) ? `${key.toUpperCase()}${text.slice(eq)}` : text;
    });
    const lines = [];
    let line = `${head} `;
    let fresh = true;
    tokens.forEach((token, i) => {
        const text = i < tokens.length - 1 ? `${token},` : token;
        if (line.length + text.length > LAST_COLUMN && !fresh) {
            lines.push(line);
            line = CONTINUE_PREFIX;
            fresh = true;
        }

        if (line.length + text.length <= LAST_COLUMN) {
            line += text;
            fresh = false;
            return;
        }

        const pieces = splitQuoted(text, line.length + 1);
        if (!pieces) {
            lines.push(null);
            return;
        }

        pieces.slice(0, -1).forEach(piece => {
            lines.push(line + piece);
            line = CONTINUE_PREFIX;
        });
        line += pieces[pieces.length - 1];
        fresh = false;
    });

    if (lines.includes(null)) {
        return { reason: 'a parameter is too long to continue' };
    }

    if (stmt.comment) {
        if (line.length + 1 + stmt.comment.length > LAST_COLUMN) {
            return { reason: 'its comment would run past column 71' };
        }

        line += ` ${stmt.comment}`;
    }

    lines.push(line);
    return { lines };
}

// What a version of the JCL means: its statements and parameters, and its
// diagnostics apart from line lengths.
function meaning(text) {
    const statements = lex(text).statements.map(s => (s.type === 'STMT'
        ? [s.type, (s.name || '').toUpperCase(), s.op.toUpperCase(), LEFT_ALONE.has(s.op.toUpperCase()) ? s.operand
            : tokenizeParams(s.operand).params.map(p => [p.kind, p.key || '', p.value])]
        : [s.type]));
    const codes = validate(text).diagnostics.filter(d => d.code !== 'JCLL002').map(d => `${d.code}:${d.severity}`).sort();
    return JSON.stringify({ statements, codes });
}

/**
 * Formats `source`. Returns `{ text, changed, notes, refused }`: `changed`
 * lists the 1-based lines of `text` that differ from the input, `notes` say
 * which statements were left as they are and why, and `refused` says why
 * nothing was changed, if so.
 */
function format(source) {
    const input = (source || '').replace(/\r/g, '');
    if (!input) {
        return { text: '', changed: [], notes: [], refused: null };
    }

    const lines = input.split('\n');
    const unwrapped = unwrapOverflow(lines, lex(input).statements);
    const read = unwrapped.map(l => l.text).join('\n');
    const statements = lex(read).statements;
    const byFirstLine = new Map(statements.map(s => [s.line, s]));
    const output = [];
    const changed = [];
    const notes = [];
    for (let i = 0; i < unwrapped.length; i++) {
        const stmt = byFirstLine.get(i + 1);
        const block = stmt && stmt.type === 'STMT' ? unwrapped.slice(i, stmt.endLine) : [unwrapped[i]];
        let newLines = block.map(l => l.text);
        if (stmt && stmt.type === 'STMT' && stmt.op && !LEFT_ALONE.has(stmt.op.toUpperCase())) {
            const marked = block.some(l => l.text.length > LAST_COLUMN || (l.text[71] && l.text[71] !== ' '));
            const result = marked ? { reason: 'it has text in columns 72-80' } : layout(stmt);
            if (result.lines) {
                newLines = result.lines;
            } else {
                notes.push({ line: stmt.line, message: `Left as it is: ${result.reason}.` });
            }
        }

        const same = newLines.length === block.length && newLines.every((t, k) => t === block[k].text && !block[k].changed);
        newLines.forEach(t => {
            output.push(t);
            if (!same) {
                changed.push(output.length);
            }
        });
        i += block.length - 1;
    }

    const text = output.join('\n');
    if (meaning(text) !== meaning(read)) {
        return {
            text: source,
            changed: [],
            notes,
            refused: 'The formatted JCL would not mean the same as yours, so nothing was changed.'
        };
    }

    return { text, changed, notes, refused: null };
}

module.exports = { format };
