// Columns 72-80 and continued comments (Features.md feature 4).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { lex } = require('../src/lexer');
const { validate } = require('../src/validator');

// Pads a statement to column 71, then adds column 72 and columns 73-80.
function card(text, mark = ' ', seq = '') {
    return text.padEnd(71) + mark + seq;
}

const stmts = source => lex(source).statements.filter(s => s.type === 'STMT');
const codes = source => validate(source).diagnostics.map(d => d.code);

test('statement columns', async (t) => {
    await t.test('Z: a blank column 72 and no comment reads as before', () => {
        const [s] = stmts('//J1 JOB CLASS=A\n');
        assert.equal(s.operand, 'CLASS=A');
        assert.equal(s.comment, '');
    });

    await t.test('B: a character in column 71 is part of the operand', () => {
        const line = '//DD1 DD DSN=' + 'A.'.repeat(28) + 'BC';
        assert.equal(line.length, 71);
        const [s] = stmts(line + '\n');
        assert.ok(s.operand.endsWith('BC'));
    });

    await t.test('B: an 80-character line with sequence numbers gives no diagnostics', () => {
        const job = card('//J1 JOB CLASS=A', ' ', '00010000');
        assert.equal(job.length, 80);
        assert.deepEqual(codes(job + '\n' + card('//S1 EXEC PGM=IEFBR14', ' ', '00020000') + '\n'), []);
    });

    await t.test('S: card-image JCL with sequence numbers on every line is clean', () => {
        const lines = [
            '//J1 JOB CLASS=A',
            '//* A COMMENT',
            '//S1 EXEC PGM=SORT',
            '//SYSOUT DD SYSOUT=*',
            '//SYSIN DD *',
            '/*',
            '//'
        ].map((l, i) => card(l, ' ', String((i + 1) * 10000).padStart(8, '0')));
        lines.splice(5, 0, '  SORT FIELDS=COPY'.padEnd(72) + '00055000');
        assert.deepEqual(codes(lines.join('\n') + '\n'), []);
    });

    await t.test('O: in-stream data keeps columns 73-80', () => {
        const data = '  DATA'.padEnd(72) + 'KEEPME00';
        const result = validate(`//J1 JOB\n//S1 EXEC PGM=X\n//IN DD *\n${data}\n/*\n`);
        assert.equal(result.ast.job.steps[0].dds[0].instreamData[0], data);
    });
});

test('continued comments', async (t) => {
    await t.test('O: a marked column 72 and one comment line give one statement with both parts', () => {
        const source = card('//S1 EXEC PGM=IEFBR14  FIRST PART', 'X') + '\n//     SECOND PART\n';
        const all = stmts(source);
        assert.equal(all.length, 1);
        assert.equal(all[0].comment, 'FIRST PART SECOND PART');
        assert.equal(all[0].endLine, 2);
    });

    await t.test('M: Nick\'s item 2 is one EXEC over lines 2-6, with no THE or FOR operation', () => {
        const source = fs.readFileSync(path.join(__dirname, 'fixtures', 'nick', '02-continued-comment.jcl'), 'utf8');
        const all = stmts(source);
        assert.equal(all.length, 2);
        assert.equal(all[1].op, 'EXEC');
        assert.equal(all[1].line, 2);
        assert.equal(all[1].endLine, 6);
        assert.ok(!codes(source).includes('JCLP002'));
    });

    await t.test('M: a continued operand with a marked column 72 still continues', () => {
        const source = card('//DD1 DD DSN=A.B,  A COMMENT', 'X') + '\n//         DISP=SHR\n';
        const [s] = stmts(source);
        assert.equal(s.operand, 'DSN=A.B,DISP=SHR');
        assert.deepEqual(lex(source).diagnostics, []);
    });

    await t.test('I: diagnostics on a commented statement point to its first line', () => {
        const source = '//J1 JOB\n' + card('//S1 EXEC PGM=X,BADKEY=1  NOTE', 'X') + '\n//     MORE\n';
        const d = validate(source).diagnostics.find(x => x.code === 'JCLK001');
        assert.equal(d.line, 2);
    });

    await t.test('E: a marked line followed by a new statement gives JCLL004 and keeps the statement', () => {
        const source = card('//S1 EXEC PGM=X  NOTE', 'X') + '\n//S2 EXEC PGM=Y\n';
        const { statements, diagnostics } = lex(source);
        assert.deepEqual(diagnostics.map(d => [d.code, d.line, d.column, d.severity]), [['JCLL004', 1, 72, 'error']]);
        assert.equal(statements.filter(s => s.type === 'STMT').length, 2);
    });

    await t.test('E: a mark on the last line gives JCLL004 without a crash', () => {
        const { diagnostics } = lex(card('//S1 EXEC PGM=X', 'X'));
        assert.deepEqual(diagnostics.map(d => d.code), ['JCLL004']);
    });
});
