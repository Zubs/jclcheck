// Splits a JCL operand string (e.g. "DSN=MY.FILE,DISP=(NEW,CATLG,DELETE),UNIT=SYSDA")
// into a list of parameters, respecting parentheses and quoted strings so
// that commas inside DISP=(...) or 'literals' don't cause a false split.
//
// Each parameter is either:
//   { kind: 'positional', value, col }
//   { kind: 'keyword', key, value, col, valueCol }
//
// `value` for keyword params retains its raw text (which may itself be a
// parenthesized sub-list like "(NEW,CATLG,DELETE)"), plus a parsed form
// `subvalues` if it was parenthesized: array of strings.

function unbalancedParenCheck(text) {
    let depth = 0;
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
            depth++;
        } else if (ch === ')') {
            depth--;
            if (depth < 0) {
                return { ok: false, at: i };
            }
        }
    }

    if (depth !== 0 || inQuote) {
        return { ok: false, at: text.length };
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

/**
 * @param {string} operand raw operand text
 * @param {number} baseCol 1-indexed column where operand starts (for single-line stmts)
 */
function tokenizeParams(operand, baseCol = 1) {
    const parenCheck = unbalancedParenCheck(operand);
    const params = [];
    const errors = [];

    if (!parenCheck.ok) {
        errors.push({ code: 'JCLP003', column: baseCol + parenCheck.at });
    }

    const parts = splitTopLevel(operand);
    for (const part of parts) {
        const raw = part.text;
        const trimmed = raw.trim();
        if (trimmed === '') {
            continue;
        }

        const leadingWs = raw.length - raw.trimStart().length;
        const col = baseCol + part.col + leadingWs;
        const eqIdx = findTopLevelEquals(trimmed);
        if (eqIdx === -1) {
            params.push({
                kind: 'positional',
                value: trimmed,
                col
            });
        } else {
            const key = trimmed.slice(0, eqIdx).trim();
            const valueRaw = trimmed.slice(eqIdx + 1).trim();
            const valueCol = col + eqIdx + 1;
            let subvalues = null;
            if (valueRaw.startsWith('(') && valueRaw.endsWith(')')) {
                subvalues = parseSubvalues(valueRaw);
            }

            params.push({
                kind: 'keyword',
                key: key.toUpperCase(),
                rawKey: key,
                value: valueRaw,
                subvalues,
                col,
                valueCol
            });
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
    splitTopLevel,
    parseSubvalues,
    unbalancedParenCheck
};
