// Colours JCL for the editor's highlight layer, line by line, without the API.
// Each character gets a class (name, op, kw, val, str, cmt, data, jes, cont,
// seq or none); diagnostics add an underline in their severity colour. Only
// in-stream data and open continuations carry from one line to the next, so
// an unclosed quote colours no further than its own line.

const WORD = /[A-Za-z0-9$#@&.*+\-/]/;
const SEVERITY_RANK = { info: 1, warning: 2, error: 3 };

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Scans the operand from `start`, colouring keywords, values and strings.
// Returns where it stopped and whether the statement continues.
function classifyOperand(text, start, cls, depthIn) {
    let i = start;
    let depth = depthIn;
    while (i < text.length) {
        const ch = text[i];
        if (ch === ' ' && depth <= 0) {
            break;
        }

        if (ch === "'") {
            let j = i + 1;
            while (j < text.length && !(text[j] === "'" && text[j + 1] !== "'")) {
                j += text[j] === "'" ? 2 : 1;
            }

            for (let k = i; k <= Math.min(j, text.length - 1); k++) {
                cls[k] = 'str';
            }

            i = j + 1;
            continue;
        }

        if (WORD.test(ch)) {
            let j = i;
            while (j < text.length && WORD.test(text[j])) {
                j++;
            }

            const kind = text[j] === '=' ? 'kw' : 'val';
            for (let k = i; k < j; k++) {
                cls[k] = kind;
            }

            i = j;
            continue;
        }

        if (ch === '(') {
            depth++;
        } else if (ch === ')') {
            depth--;
        }

        i++;
    }

    const operand = text.slice(start, i).trimEnd();
    return { end: i, depth: Math.max(depth, 0), continues: operand.endsWith(',') || depth > 0 };
}

function classifyLine(line, state) {
    const cls = new Array(line.length).fill(null);
    const fill = (from, to, c) => {
        for (let k = from; k < Math.min(to, line.length); k++) {
            cls[k] = c;
        }
    };

    const card = () => {
        fill(71, 72, 'cont');
        fill(72, 80, 'seq');
    };

    if (state.data) {
        const { dlm, star } = state.data;
        const delimiter = dlm ? line.startsWith(dlm) : /^\/\*( |$)/.test(line.slice(0, 71));
        const endsAtStatement = !dlm && star && line.startsWith('//') && !line.startsWith('//*');
        if (!delimiter && !endsAtStatement) {
            fill(0, line.length, 'data');
            return cls;
        }

        state.data = null;
        if (delimiter) {
            fill(0, dlm ? dlm.length : 2, 'op');
            return cls;
        }
    }

    if (line.startsWith('//*')) {
        fill(0, 71, 'cmt');
        card();
        state.continues = false;
        return cls;
    }

    if (/^\/\*[A-Za-z$]/.test(line)) {
        fill(0, 71, 'jes');
        card();
        return cls;
    }

    if (!line.startsWith('//')) {
        return cls;
    }

    const text = line.slice(0, 71);
    let i = 2;
    let op = '';
    if (!state.continues) {
        while (i < text.length && text[i] !== ' ') {
            cls[i++] = 'name';
        }

        while (text[i] === ' ') {
            i++;
        }

        const opStart = i;
        while (i < text.length && text[i] !== ' ') {
            cls[i++] = 'op';
        }

        op = text.slice(opStart, i).toUpperCase();
    }

    while (text[i] === ' ') {
        i++;
    }

    const operandStart = i;
    const result = classifyOperand(text, i, cls, state.continues ? state.depth : 0);
    fill(result.end, text.length, text.slice(result.end).trim() ? 'cmt' : null);
    for (let k = result.end; k < text.length; k++) {
        if (text[k] === ' ') {
            cls[k] = null;
        }
    }

    card();

    const operand = text.slice(operandStart, result.end);
    if (op === 'DD' && (/^\*/.test(operand) || /(^|,)DATA(,|$)/i.test(operand))) {
        state.pendingData = { star: operand.startsWith('*'), dlm: null };
    }

    const dlm = operand.match(/(?:^|,)DLM=('?)([^,']{2})\1/i);
    if (state.pendingData && dlm) {
        state.pendingData.dlm = dlm[2];
    }

    state.continues = result.continues;
    state.depth = result.depth;
    if (!result.continues && state.pendingData) {
        state.data = state.pendingData;
        state.pendingData = null;
    }

    return cls;
}

/** One array of character classes per line. */
export function classifyLines(text) {
    const state = { data: null, pendingData: null, continues: false, depth: 0 };
    return text.replace(/\r/g, '').split('\n').map(line => classifyLine(line, state));
}

/** The diagnostics covering a 1-based line and column. */
export function diagnosticsAt(diagnostics, line, column) {
    return diagnostics.filter(d => d.line === line && column >= d.column && column < d.column + Math.max(d.length || 1, 1));
}

/** HTML for the highlight layer: escaped text in class and underline runs. */
export function renderHtml(text, diagnostics = []) {
    const lines = text.replace(/\r/g, '').split('\n');
    const classes = classifyLines(text);
    const underline = lines.map(l => new Array(l.length).fill(null));
    for (const d of diagnostics) {
        const row = underline[d.line - 1];
        for (let k = d.column - 1; row && k < d.column - 1 + Math.max(d.length || 1, 1) && k < row.length; k++) {
            if (!row[k] || SEVERITY_RANK[d.severity] > SEVERITY_RANK[row[k]]) {
                row[k] = d.severity;
            }
        }
    }

    const html = lines.map((line, n) => {
        let out = '';
        let start = 0;
        for (let k = 1; k <= line.length; k++) {
            const same = k < line.length && classes[n][k] === classes[n][start] && underline[n][k] === underline[n][start];
            if (!same) {
                const names = [classes[n][start] && `t-${classes[n][start]}`, underline[n][start] && `u-${underline[n][start]}`].filter(Boolean);
                const run = escapeHtml(line.slice(start, k));
                out += names.length ? `<span class="${names.join(' ')}">${run}</span>` : run;
                start = k;
            }
        }

        return out;
    });

    // A trailing newline keeps the last line's height, as in the textarea.
    return html.join('\n') + '\n';
}
