// Parses the condition of an IF statement (everything from after "IF" up to
// "THEN") into the step references it makes and the problems it has. Nothing
// is evaluated: a static checker can't know the return codes a job produces.
//
// Input is a list of { ch, line, col } so every token keeps its real position,
// even when the condition is continued over several lines.

const KEYWORDS = new Set(['RC', 'ABEND', 'ABENDCC', 'RUN']);
const SYMBOL_OPS = new Set(['=', '>', '<', '>=', '<=', '¬=', '¬>', '¬<']);
const WORD_OPS = new Set(['GT', 'GE', 'LT', 'LE', 'EQ', 'NE', 'NG', 'NL']);
const MAX_RC = 4095;

class ConditionError extends Error {
    constructor(code, data, at) {
        super(code);
        this.diagnostic = { code, data, line: at.line, col: at.col };
    }
}

function tokenize(chars) {
    const tokens = [];
    let i = 0;
    while (i < chars.length) {
        const { ch, line, col } = chars[i];
        if (ch === ' ') {
            i++;
            continue;
        }

        if ('()&|'.includes(ch)) {
            tokens.push({ type: { '&': 'and', '|': 'or' }[ch] || ch, text: ch, line, col });
            i++;
            continue;
        }

        if ('<>=¬'.includes(ch)) {
            let text = '';
            while (i < chars.length && '<>=¬'.includes(chars[i].ch)) {
                text += chars[i++].ch;
            }

            if (text === '¬') {
                tokens.push({ type: 'not', text, line, col });
            } else if (SYMBOL_OPS.has(text)) {
                tokens.push({ type: 'op', text, line, col });
            } else {
                throw new ConditionError('JCLC001', { detail: `'${text}' is not a comparison operator.` }, { line, col });
            }

            continue;
        }

        if (/[A-Za-z0-9$#@.]/.test(ch)) {
            let text = '';
            while (i < chars.length && /[A-Za-z0-9$#@.]/.test(chars[i].ch)) {
                text += chars[i++].ch;
            }

            const upper = text.toUpperCase();
            const type = { AND: 'and', OR: 'or', NOT: 'not', THEN: 'then' }[upper] || (WORD_OPS.has(upper) ? 'op' : 'word');
            tokens.push({ type, text: upper, line, col });
            continue;
        }

        throw new ConditionError('JCLC001', { detail: `'${ch}' is not allowed in an IF condition.` }, { line, col });
    }

    return tokens;
}

// `requireThen` is false for conditions that stand alone, such as WHEN= on
// the NOTIFY statement.
function parseCondition(chars, start, { requireThen = true } = {}) {
    const refs = [];
    const errors = [];
    let tokens;
    try {
        tokens = tokenize(chars);
    } catch (err) {
        return { refs, errors: [err.diagnostic] };
    }

    let pos = 0;
    const peek = () => tokens[pos];
    const end = () => (tokens.length ? tokens[tokens.length - 1] : start);
    const syntax = (detail, at) => new ConditionError('JCLC001', { detail }, at || end());

    function parseTest(token) {
        const parts = token.text.split('.');
        const keyword = parts[parts.length - 1];
        if (!KEYWORDS.has(keyword) || parts.length > 3 || parts.some(p => p === '')) {
            throw syntax(`'${token.text}' is not RC, ABEND, ABENDCC or RUN (optionally after a step name).`, token);
        }

        if (parts.length > 1) {
            refs.push({ step: parts[0], procstep: parts.length === 3 ? parts[1] : null, line: token.line, col: token.col });
        }

        if (!peek() || peek().type !== 'op') {
            if (keyword === 'RC' || keyword === 'ABENDCC') {
                throw syntax(`${keyword} must be compared with a value, for example ${keyword === 'RC' ? 'RC = 0' : 'ABENDCC = S0C4'}.`, token);
            }

            return;
        }

        const op = tokens[pos++];
        const value = tokens[pos++];
        if (!value || value.type !== 'word') {
            throw syntax(`'${op.text}' must be followed by a value.`, value || op);
        }

        const at = { line: value.line, col: value.col };
        if (keyword === 'RC') {
            if (!/^\d+$/.test(value.text) || Number(value.text) > MAX_RC) {
                errors.push({ code: 'JCLC002', data: { value: value.text }, ...at });
            }
        } else if (keyword === 'ABENDCC') {
            const user = value.text.match(/^U(\d{4})$/);
            if (!/^S[0-9A-F]{3}$/.test(value.text) && !(user && Number(user[1]) <= MAX_RC)) {
                errors.push({ code: 'JCLC003', data: { value: value.text }, ...at });
            }
        } else if (value.text !== 'TRUE' && value.text !== 'FALSE') {
            throw syntax(`${keyword} can only be compared with TRUE or FALSE.`, value);
        }
    }

    function parsePrimary() {
        const token = tokens[pos++];
        if (!token || token.type === 'then') {
            throw syntax('A condition is missing here.', token);
        }

        if (token.type === '(') {
            parseExpr();
            if (!peek() || peek().type !== ')') {
                throw syntax(`The '(' here has no matching ')'.`, token);
            }

            pos++;
        } else if (token.type === 'word') {
            parseTest(token);
        } else {
            throw syntax(`'${token.text}' is not expected here.`, token);
        }
    }

    function parseUnary() {
        if (peek() && peek().type === 'not') {
            pos++;
            parseUnary();
        } else {
            parsePrimary();
        }
    }

    function parseExpr() {
        parseUnary();
        while (peek() && (peek().type === 'and' || peek().type === 'or')) {
            pos++;
            parseUnary();
        }
    }

    try {
        parseExpr();
        const next = peek();
        if (!next && !requireThen) {
            return { refs, errors };
        }

        if (!next) {
            throw new ConditionError('JCLC006', {}, end());
        }

        if (next.type !== 'then') {
            throw syntax(`'${next.text}' is not expected here.`, next);
        }
    } catch (err) {
        if (!err.diagnostic) {
            throw err;
        }

        errors.push(err.diagnostic);
    }

    return { refs, errors };
}

// Splits the condition text as written, keeping each character's position.
function conditionChars(text, line, col) {
    return [...text].map((ch, i) => ({ ch, line, col: col + i }));
}

module.exports = { parseCondition, conditionChars };
