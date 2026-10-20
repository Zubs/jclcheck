// Splits a JCL operand string (e.g. "DSN=MY.FILE,DISP=(NEW,CATLG,DELETE),UNIT=SYSDA")
// into a list of parameters, respecting parentheses and quoted strings so
// that commas inside DISP=(...) or 'literals' don't cause a false split.
//
// Each parameter is either:
//   { kind: 'positional', value, col } (value '' and empty: true for an
//     omitted positional such as the first one in ",'NAME'")
//   { kind: 'keyword', key, value, col, valueCol }
//
// For a continued statement, the lexer's `pieces` say where each part of the
// joined operand was written, so every parameter also gets the physical
// `line` (and `valueLine`) it is on, and a value that runs onto another line
// gets `valueBreaks` for valuePosition().
//
// `value` for keyword params retains its raw text (which may itself be a
// parenthesized sub-list like "(NEW,CATLG,DELETE)"), plus a parsed form
// `subvalues` if it was parenthesized: array of strings.

function unbalancedParenCheck(text) {
    const open = [];
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuote) {
            if (ch === "'") {
                if (text[i + 1] === "'") {
                    i++;
                    continue;
                }

                inQuote = false;
            }

            continue;
        }

        if (ch === "'") {
            inQuote = true;
            continue;
        }

        if (ch === '(') {
            open.push(i);
        } else if (ch === ')') {
            if (!open.length) {
                return { ok: false, at: i };
            }

            open.pop();
        }
    }

    // An unclosed quote alone is the lexer's JCLL003, not a parenthesis error.
    if (open.length) {
        return { ok: false, at: open[0] };
    }

    return { ok: true };
}

function splitTopLevel(text) {
    // Split on commas that are not inside parens or quotes.
    const parts = [];
    let depth = 0, inQuote = false, start = 0;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuote) {
            if (ch === "'") {
                if (text[i + 1] === "'") {
                    i++;
                    continue;
                }

                inQuote = false;
            }

            continue;
        }

        if (ch === "'") {
            inQuote = true;
            continue;
        }

        if (ch === '(') {
            depth++;
        } else if (ch === ')') {
            depth--;
        } else if (ch === ',' && depth === 0) {
            parts.push({ text: text.slice(start, i), col: start });
            start = i + 1;
        }
    }

    parts.push({ text: text.slice(start), col: start });
    return parts;
}

function parseSubvalues(parenText) {
    // parenText includes surrounding parens, e.g. "(NEW,CATLG,DELETE)"
    const inner = parenText.slice(1, -1);
    return splitTopLevel(inner).map(p => p.text.trim()).filter(p => p.length > 0 || true);
}

// The physical line and column of an offset in the joined operand.
function positionAt(pieces, baseCol, offset) {
    if (!pieces) {
        return { col: baseCol + offset };
    }

    let piece = pieces[0];
    for (const p of pieces) {
        if (p.offset > offset) {
            break;
        }

        piece = p;
    }

    return { line: piece.line, col: piece.col + offset - piece.offset };
}

/** Where character `index` of a keyword's value is written. */
function valuePosition(param, index) {
    let at = { line: param.valueLine, col: param.valueCol + index };
    for (const b of param.valueBreaks || []) {
        if (b.at <= index) {
            at = { line: b.line, col: b.col + index - b.at };
        }
    }

    return at;
}

/**
 * @param {string} operand raw operand text
 * @param {number} baseCol 1-indexed column where operand starts (for single-line stmts)
 * @param {object[]} [pieces] the lexer's { offset, line, col } for each physical line
 */
function tokenizeParams(operand, baseCol = 1, pieces = null) {
    const parenCheck = unbalancedParenCheck(operand);
    const params = [];
    const errors = [];
    const at = offset => positionAt(pieces, baseCol, offset);
    // A length that stops at the end of the line the text starts on.
    const onFirstLine = (offset, length) => {
        const next = pieces && pieces.find(p => p.offset > offset);
        return Math.max(Math.min(length, (next ? next.offset : operand.length) - offset), 1);
    };

    if (!parenCheck.ok) {
        const { line, col } = at(parenCheck.at);
        errors.push({ code: 'JCLP003', line, column: col });
    }

    const parts = splitTopLevel(operand);
    let sawKeyword = false;
    for (const part of parts) {
        const raw = part.text;
        const trimmed = raw.trim();
        const leadingWs = raw.length - raw.trimStart().length;
        const start = part.col + leadingWs;
        const { line, col } = at(start);
        const where = line === undefined ? { col } : { line, col };
        where.length = onFirstLine(start, Math.max(trimmed.length, 1));
        if (trimmed === '') {
            // An omitted positional (",,") still takes a position, so it is
            // kept until the first keyword; later empty parts are just noise.
            if (!sawKeyword && parts.length > 1) {
                params.push({ kind: 'positional', value: '', empty: true, ...where });
            }

            continue;
        }

        const eqIdx = findTopLevelEquals(trimmed);
        if (eqIdx === -1) {
            params.push({
                kind: 'positional',
                value: trimmed,
                ...where
            });
        } else {
            sawKeyword = true;
            const key = trimmed.slice(0, eqIdx).trim();
            where.length = onFirstLine(start, Math.max(key.length, 1));
            const afterEq = trimmed.slice(eqIdx + 1);
            const valueRaw = afterEq.trim();
            const valueStart = start + eqIdx + 1 + (afterEq.length - afterEq.trimStart().length);
            const value = at(valueStart);
            let subvalues = null;
            if (valueRaw.startsWith('(') && valueRaw.endsWith(')')) {
                subvalues = parseSubvalues(valueRaw);
            }

            const param = {
                kind: 'keyword',
                key: key.toUpperCase(),
                rawKey: key,
                value: valueRaw,
                subvalues,
                ...where,
                valueCol: value.col,
                valueLength: onFirstLine(valueStart, Math.max(valueRaw.length, 1))
            };
            if (pieces) {
                param.valueLine = value.line;
                const breaks = pieces.filter(p => p.offset > valueStart && p.offset < valueStart + valueRaw.length);
                if (breaks.length) {
                    param.valueBreaks = breaks.map(p => ({ at: p.offset - valueStart, line: p.line, col: p.col }));
                }
            }

            params.push(param);
        }
    }

    return { params, errors };
}

function findTopLevelEquals(text) {
    let depth = 0, inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuote) {
            if (ch === "'") {
                if (text[i + 1] === "'") {
                    i++;
                    continue;
                }

                inQuote = false;
            }

            continue;
        }

        if (ch === "'") {
            inQuote = true;
            continue;
        }

        if (ch === '(') {
            depth++;
        } else if (ch === ')') {
            depth--;
        } else if (ch === '=' && depth === 0) {
            return i;
        }
    }

    return -1;
}

module.exports = {
    tokenizeParams,
    valuePosition,
    splitTopLevel,
    parseSubvalues,
    unbalancedParenCheck
};
