// Finds the keyword or value under a position in the editor and explains it
// from the descriptions GET /api/keywords returns (feature 40).

import { classifyLines } from './highlight';

// Splits on commas outside brackets and quotes.
function splitTop(text) {
    const parts = [];
    let depth = 0, inQuote = false, start = 0;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === "'") {
            inQuote = !inQuote;
        } else if (!inQuote && ch === '(') {
            depth++;
        } else if (!inQuote && ch === ')') {
            depth--;
        } else if (!inQuote && depth === 0 && ch === ',') {
            parts.push(text.slice(start, i));
            start = i + 1;
        }
    }

    parts.push(text.slice(start));
    return parts;
}

// The value after the = at `eq`, up to the next comma or blank outside brackets.
function valueAfter(text, eq) {
    let depth = 0, inQuote = false, i = eq + 1;
    for (; i < text.length; i++) {
        const ch = text[i];
        if (ch === "'") {
            inQuote = !inQuote;
        } else if (!inQuote && ch === '(') {
            depth++;
        } else if (!inQuote && ch === ')') {
            depth--;
        } else if (!inQuote && depth <= 0 && (ch === ',' || ch === ' ')) {
            break;
        }
    }

    return text.slice(eq + 1, i);
}

// Walks left from a value to its keyword's =, or returns -1 when the value
// is positional or its keyword is on an earlier line.
function equalsBefore(text, classes, start) {
    let depth = 0;
    // A comma passed outside any bracket ends this parameter, unless a
    // bracket opened further left turns out to hold it, as in DISP=(NEW,KEEP).
    let passedComma = false;
    for (let i = start - 1; i >= 0; i--) {
        if (classes[i] === 'str') {
            continue;
        }

        const ch = text[i];
        if (ch === ')') {
            depth++;
        } else if (ch === '(') {
            depth--;
        } else if (ch === '=' && depth <= 0) {
            return depth < 0 || !passedComma ? i : -1;
        } else if (ch === ',' && depth === 0) {
            passedComma = true;
        } else if (ch === ' ' && depth >= 0) {
            return -1;
        }
    }

    return -1;
}

function describeParts(entry, value) {
    const inner = /^\(.*\)$/.test(value) ? value.slice(1, -1) : value;
    const parts = splitTop(inner);
    if (entry.positions) {
        return parts.slice(0, entry.positions.length).map((part, i) => {
            const position = entry.positions[i];
            const known = position.values && position.values[part.toUpperCase()];
            return { label: position.label, value: part, text: known || (part ? position.other || '' : 'Not given, so the default applies.') };
        });
    }

    if (entry.values) {
        return parts.filter(Boolean).map(part => ({ value: part, text: entry.values[part.toUpperCase()] || '' }));
    }

    return [];
}

/**
 * What is under 1-based `line` and `column`: null for blanks, comments and
 * anything not a keyword or value; otherwise `{ stmt, keyword, text?, parts,
 * since?, reference?, unknown? }`.
 */
export function explainAt(source, line, column, keywords) {
    if (!keywords) {
        return null;
    }

    const lines = source.replace(/\r/g, '').split('\n');
    const text = lines[line - 1];
    const classes = classifyLines(source)[line - 1];
    const kind = classes && classes[column - 1];
    if (!text || !['kw', 'val', 'str'].includes(kind)) {
        return null;
    }

    const table = keywords.statements[classes.op];
    if (!table) {
        return null;
    }

    let start = column - 1;
    while (start > 0 && classes[start - 1] === kind) {
        start--;
    }

    let keyword, eq;
    if (kind === 'kw') {
        let end = start;
        while (end < text.length && classes[end] === 'kw') {
            end++;
        }

        keyword = text.slice(start, end);
        eq = end;
    } else {
        eq = equalsBefore(text, classes, start);
        if (eq === -1) {
            // A positional value such as DUMMY is described like a keyword.
            const word = text.slice(start, column + text.slice(column).search(/[^A-Za-z0-9$#@]|$/));
            return table[word.toUpperCase()] ? { stmt: classes.op, keyword: word.toUpperCase(), ...table[word.toUpperCase()], parts: [] } : null;
        }

        let keyStart = eq;
        while (keyStart > 0 && classes[keyStart - 1] === 'kw') {
            keyStart--;
        }

        keyword = text.slice(keyStart, eq);
    }

    const name = keyword.toUpperCase().split('.')[0];
    const entry = table[name];
    if (!entry) {
        return { stmt: classes.op, keyword: name, unknown: true, parts: [] };
    }

    const value = text[eq] === '=' ? valueAfter(text, eq) : '';
    return { stmt: classes.op, keyword: name, ...entry, parts: value ? describeParts(entry, value) : [] };
}
