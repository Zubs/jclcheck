// Quoted strings continued onto the next line (Features.md feature 5).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { lex } = require('../src/lexer');
const { validate } = require('../src/validator');

const stmts = source => lex(source).statements.filter(s => s.type === 'STMT');
const diags = source => validate(source).diagnostics.map(d => [d.code, d.line, d.column]);
const parm = source => validate(source).ast.jobs[0].steps[0].params.find(p => p.key === 'PARM').value;

// A continuation line whose text starts in the given column.
const resume = (text, column = 16) => '//' + ' '.repeat(column - 3) + text;

test('continued quoted strings', async (t) => {
    await t.test('Z: a quoted value on one line is unchanged', () => {
        assert.equal(parm("//J JOB\n//S EXEC PGM=X,PARM='A B'\n"), "'A B'");
    });

    await t.test('O: Nick\'s item 3 is clean and the PARM holds the whole sentence', () => {
        const source = fs.readFileSync(path.join(__dirname, 'fixtures', 'nick', '03-continued-quote.jcl'), 'utf8');
        assert.deepEqual(diags(source), []);
        assert.equal(parm(source), "'THIS IS A LONG PARAMETER WITHIN APOSTROPHES, CONTINUED IN COLUMN 16 OF THE NEXT RECORD'");
    });

    await t.test('M: a string over three lines joins in order', () => {
        const first = "//S EXEC PGM=X,PARM='ONE".padEnd(71, '-');
        const second = resume('TWO'.padEnd(56, '-'));
        assert.equal(second.length, 71);
        const source = `//J JOB\n${first}\n${second}\n${resume("THREE'")}\n`;
        assert.deepEqual(diags(source), []);
        assert.equal(parm(source), first.slice(first.indexOf("'")) + second.slice(15) + "THREE'");
    });

    await t.test('B: ending at column 71 adds no blanks; ending at column 60 adds 11', () => {
        const at71 = "//S EXEC PGM=X,PARM='A".padEnd(71, 'B');
        assert.ok(parm(`//J JOB\n${at71}\n${resume("C'")}\n`).endsWith("BC'"));
        const at60 = "//S EXEC PGM=X,PARM='A".padEnd(60, 'B');
        assert.ok(parm(`//J JOB\n${at60}\n${resume("C'")}\n`).endsWith('B' + ' '.repeat(11) + "C'"));
    });

    for (const column of [15, 17]) {
        await t.test(`B/I: resuming in column ${column} gives JCLL005 at that column on the continuation line`, () => {
            const result = validate(`//J JOB\n//S EXEC PGM=X,PARM='ABC\n${resume("DEF'", column)}\n`);
            const d = result.diagnostics.find(x => x.code === 'JCLL005');
            assert.deepEqual([d.line, d.column, d.severity], [3, column, 'error']);
            assert.match(d.message, new RegExp(`found column ${column}`));
        });
    }

    await t.test('O: text after the closing quote is a further parameter, and the comment is kept', () => {
        const source = `//J JOB\n//S EXEC PGM=X,PARM='ABC\n${resume("DEF',REGION=4M  A COMMENT")}\n`;
        const [, step] = stmts(source);
        assert.equal(step.comment, 'A COMMENT');
        assert.ok(validate(source).ast.jobs[0].steps[0].params.some(p => p.key === 'REGION'));
        assert.deepEqual(diags(source), []);
    });

    await t.test('E: a doubled quote split across the break is one literal quote', () => {
        const first = "//S EXEC PGM=X,PARM='IT".padEnd(70, ' ') + "'";
        assert.equal(first.length, 71);
        const source = `//J JOB\n${first}\n${resume("'S FINE'")}\n`;
        assert.equal(stmts(source).length, 2);
        assert.match(parm(source), /IT +''S FINE'$/);
        assert.deepEqual(diags(source), []);
    });

    await t.test('E: a string never closed gets JCLL003 on its last line and no JCLP003', () => {
        const source = `//J JOB\n//S EXEC PGM=X,PARM='ABC\n${resume('DEF')}\n//S2 EXEC PGM=Y\n`;
        const codes = diags(source);
        assert.deepEqual(codes.filter(([c]) => c === 'JCLL003'), [['JCLL003', 3, 1]]);
        assert.ok(!codes.some(([c]) => c === 'JCLP003'));
    });

    await t.test('E: unbalanced parentheses still get JCLP003', () => {
        assert.ok(diags('//J JOB\n//S EXEC PGM=X\n//D DD DSN=A.B,DISP=(NEW,KEEP\n').some(([c]) => c === 'JCLP003'));
    });
});
