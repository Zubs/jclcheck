// Turns raw JCL source text into a stream of "logical statements".
// A logical statement is one or more physical lines joined via continuation.
//
// Each physical JCL line is an 80-column record:
//   cols 1-2   : "//"
//   cols 3-10  : name field (optional)
//   col  11    : blank
//   cols 12-15 : operation (JOB/EXEC/DD/...)  -- free-ish in practice
//   operand field, then comments after a blank, up to column 71
//   col  72    : continuation column - non-blank continues a comment
//   cols 73-80 : sequence numbers, ignored
//
// Only columns 1-71 are read as statement text, as z/OS does; in-stream
// data lines are kept whole. We are lenient about the positions of the
// name, operation and operand fields (as most modern shops are) but flag
// lines that are too long, and detect operand continuations via a
// trailing comma or an open parenthesis/quote.

const { makeDiagnostic } = require('./errors');

function isCommentLine(line) {
    return /^\/\/\*/.test(line);
}

function isJclLine(line) {
    return /^\/\//.test(line);
}

function statementText(line) {
    return line.slice(0, 71);
}

function continuationMark(line) {
    return line.length > 71 && line[71] !== ' ';
}

/**
 * Splits a raw physical "//name OP operand comment" line into fields.
 * Returns { name, op, rest, nameCol, opCol, restCol }
 */
function splitFields(line) {
    // line starts with '//'
    let i = 2;
    const len = line.length;

    // name field: non-blank chars right after //
    const nameStart = i;
    while (i < len && line[i] !== ' ') {
        i++;
    }

    const name = line.slice(nameStart, i);
    const nameCol = nameStart + 1; // 1-indexed

    // skip blanks
    while (i < len && line[i] === ' ') {
        i++;
    }

    const opStart = i;
    while (i < len && line[i] !== ' ') {
        i++;
    }

    const op = line.slice(opStart, i);
    const opCol = opStart + 1;

    // skip blanks
    while (i < len && line[i] === ' ') {
        i++;
    }

    const restStart = i;
    const rest = line.slice(restStart);
    const restCol = restStart + 1;

    return {
        name,
        op,
        rest,
        nameCol,
        opCol,
        restCol
    };
}

/**
 * Given the operand+comment remainder of a line, find where the operand
 * field ends and a trailing comment begins: the first blank that is
 * outside of any parentheses/quotes.
 */
function splitOperandAndComment(rest, startInQuote = false) {
    let depth = 0;
    let inQuote = startInQuote;
    for (let i = 0; i < rest.length; i++) {
        const ch = rest[i];
        if (inQuote) {
            if (ch === "'") {
                if (rest[i + 1] === "'") {
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
        } else if (ch === ' ' && depth <= 0) {
            return { operand: rest.slice(0, i), comment: rest.slice(i).trim() };
        }
    }

    return { operand: rest, comment: '' };
}

/**
 * Determines whether the operand text (trimmed of trailing comment) ends
 * in a way that requires a continuation: a trailing comma, or unbalanced
 * open paren / open quote.
 */
function needsContinuation(operand) {
    let depth = 0;
    let inQuote = false;
    for (let i = 0; i < operand.length; i++) {
        const ch = operand[i];
        if (inQuote) {
            if (ch === "'") {
                if (operand[i + 1] === "'") {
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
        }
    }

    const trimmed = operand.replace(/\s+$/, '');
    const trailingComma = trimmed.endsWith(',');
    return {
        continues: trailingComma || depth > 0 || inQuote,
        openParens: depth,
        openQuote: inQuote,
        trailingComma
    };
}

/**
 * A string closed exactly in column 71 followed by a quote in column 16 of the
 * next line is a doubled quote ('') split over the break, not two strings.
 */
function splitsDoubledQuote(line, next) {
    const text = statementText(line);
    return next !== undefined && text.length === 71 && text[70] === "'" &&
        isJclLine(next) && statementText(next).slice(2, 15).trim() === '' && next[15] === "'";
}

/**
 * Main lexer entry point.
 * @param {string} source raw JCL text
 * @returns {{ statements: LogicalStatement[], diagnostics: Diagnostic[] }}
 */
function lex(source) {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    const diagnostics = [];
    const statements = [];
    let i = 0;
    let inInstreamData = false;
    let instreamDelim = '/*';
    let instreamOwner = null;

    while (i < lines.length) {
        const rawLine = lines[i];
        const lineNo = i + 1;

        if (inInstreamData) {
            // Pass through raw data lines until the delimiter.
            const isDelim = statementText(rawLine).trimEnd() === instreamDelim;
            if (isDelim || (isJclLine(rawLine) && !isCommentLine(rawLine))) {
                if (isDelim) {
                    instreamOwner.instreamEndLine = lineNo;
                    inInstreamData = false;
                    i++;
                    continue;
                }

                // A new JCL statement appeared without an explicit delimiter - IBM
                // allows this for */ terminated data; treat current line as end.
                inInstreamData = false;
                continue; // re-process this line as JCL
            } else {
                instreamOwner.instreamData.push(rawLine);
                i++;
                continue;
            }
        }

        if (rawLine.trim() === '') {
            i++;
            continue;
        }

        if (!isJclLine(rawLine)) {
            diagnostics.push(makeDiagnostic(
                'JCLL001',
                {},
                {
                    line: lineNo,
                    column: 1,
                    source: 'lexer'
                }
            ));

            i++;
            continue;
        }

        if (isCommentLine(rawLine)) {
            statements.push({
                type: 'COMMENT',
                text: rawLine.slice(2),
                line: lineNo,
                endLine: lineNo,
                raw: [rawLine]
            });

            i++;
            continue;
        }

        if (statementText(rawLine).trimEnd() === '//') {
            // null statement - end of job stream marker
            statements.push({
                type: 'NULL',
                line: lineNo,
                endLine: lineNo,
                raw: [rawLine]
            });

            i++;
            continue;
        }

        if (rawLine.length > 80) {
            diagnostics.push(makeDiagnostic(
                'JCLL002',
                {},
                {
                    line: lineNo,
                    column: 81,
                    source: 'lexer'
                }
            ));
        }

        const {
            name,
            op,
            rest,
            nameCol,
            opCol,
            restCol
        } = splitFields(statementText(rawLine));
        let { operand, comment } = splitOperandAndComment(rest);
        const operandCol = restCol;
        const rawPhysicalLines = [rawLine];
        let nextIdx0 = i + 1; // 0-indexed index of the next unconsumed physical line
        let lastConsumedLineNo = lineNo;

        // Handle continuations
        let cont = needsContinuation(operand);
        let quoted = cont.openQuote || splitsDoubledQuote(rawLine, lines[nextIdx0]);
        let operandComplete = true;
        while (cont.continues || quoted) {
            const looksLikeNewStatement = nextIdx0 < lines.length && isJclLine(lines[nextIdx0]) && !isCommentLine(lines[nextIdx0]) && lines[nextIdx0].length > 2 && lines[nextIdx0][2] !== ' ';
            if (nextIdx0 >= lines.length || !isJclLine(lines[nextIdx0]) || isCommentLine(lines[nextIdx0]) || looksLikeNewStatement) {
                if (cont.openQuote) {
                    diagnostics.push(makeDiagnostic(
                        'JCLL003',
                        {},
                        {
                            line: lastConsumedLineNo,
                            column: 1,
                            source: 'lexer'
                        }
                    ));
                } else {
                    diagnostics.push(makeDiagnostic(
                        'JCLP004',
                        {},
                        {
                            line: lastConsumedLineNo,
                            column: 1,
                            source: 'parser'
                        }
                    ));
                }

                operandComplete = false;
                break;
            }

            const contLine = lines[nextIdx0];
            rawPhysicalLines.push(contLine);
            let split2;
            if (quoted) {
                // A quoted string runs through column 71 (a short line is padded
                // with blanks, as on a card) and resumes in column 16.
                const prevText = statementText(lines[lastConsumedLineNo - 1]);
                const text = statementText(contLine);
                const firstText = text.slice(2).search(/\S/);
                const start = firstText === -1 ? text.length : firstText + 2;
                if (start !== 15) {
                    diagnostics.push(makeDiagnostic(
                        'JCLL005',
                        { column: start + 1 },
                        {
                            line: nextIdx0 + 1,
                            column: start + 1,
                            source: 'lexer'
                        }
                    ));
                }

                split2 = splitOperandAndComment(text.slice(start), cont.openQuote);
                operand += ' '.repeat(71 - prevText.length) + split2.operand;
            } else {
                // Continuation content: strip leading '//' then leading blanks - the
                // remainder is the continued operand (conventionally cols 4-16, but
                // we accept any indent for resilience).
                const stripped = statementText(contLine).replace(/^\/\//, '').replace(/^\s*/, '');
                split2 = splitOperandAndComment(stripped);
                operand += split2.operand;
            }

            comment = split2.comment || comment;
            lastConsumedLineNo = nextIdx0 + 1;
            nextIdx0 += 1;
            cont = needsContinuation(operand);
            quoted = cont.openQuote || splitsDoubledQuote(contLine, lines[nextIdx0]);
        }

        // A marked column 72 after a complete operand continues the comment
        // onto following "//" lines with a blank column 3; they're never parsed.
        let marked = operandComplete && continuationMark(lines[lastConsumedLineNo - 1]);
        while (marked) {
            const next = lines[nextIdx0];
            if (next === undefined || !isJclLine(next) || isCommentLine(next) || (next.length > 2 && next[2] !== ' ')) {
                diagnostics.push(makeDiagnostic(
                    'JCLL004',
                    {},
                    {
                        line: lastConsumedLineNo,
                        column: 72,
                        source: 'lexer'
                    }
                ));

                break;
            }

            rawPhysicalLines.push(next);
            const text = statementText(next).slice(2).trim();
            comment = comment ? `${comment} ${text}` : text;
            lastConsumedLineNo = nextIdx0 + 1;
            nextIdx0 += 1;
            marked = continuationMark(next);
        }

        statements.push({
            type: 'STMT',
            name,
            op,
            operand,
            comment,
            nameCol,
            opCol,
            operandCol,
            line: lineNo,
            endLine: lastConsumedLineNo,
            raw: rawPhysicalLines
        });

        i = nextIdx0; // advance past all consumed physical lines

        // Track instream data start: DD * or DD DATA
        const upperOp = op.toUpperCase();
        if (upperOp === 'DD') {
            const opUpper = operand.toUpperCase();
            if (/^\*/.test(opUpper.trim()) || /(^|,)DATA(\b|,|\()/.test(opUpper)) {
                inInstreamData = true;
                const delimMatch = operand.match(/DLM=([A-Za-z0-9]{2})/i);
                instreamDelim = delimMatch ? '//' + '' /*placeholder*/ : '/*';
                instreamDelim = delimMatch ? delimMatch[1] : '/*';
                instreamOwner = statements[statements.length - 1];
                instreamOwner.instreamData = [];
            }
        }
    }

    return { statements, diagnostics };
}

module.exports = {
    lex,
    splitFields,
    splitOperandAndComment,
    needsContinuation,
    isCommentLine,
    isJclLine,
    statementText,
    continuationMark
};
