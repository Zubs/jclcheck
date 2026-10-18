// JES2 control statements (Features.md feature 8).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { lex } = require('../src/lexer');
const { validate } = require('../src/validator');

const diags = source => validate(source).diagnostics.map(d => [d.code, d.line, d.column]);
const JOB = '//J JOB\n';
const STEP = '//S EXEC PGM=IEFBR14\n';

test('JES2 statements are recognised', async (t) => {
    await t.test('Z: a job without JES2 statements is unchanged', () => {
        assert.deepEqual(diags(JOB + STEP), []);
        assert.ok(lex(JOB + STEP).statements.every(s => s.type !== 'JES2'));
    });

    await t.test('O: /*ROUTE PRINT NODE1 after JOB is clean', () => {
        const source = JOB + '/*ROUTE PRINT NODE1\n' + STEP;
        assert.deepEqual(diags(source), []);
        const jes = lex(source).statements.find(s => s.type === 'JES2');
        assert.deepEqual([jes.name, jes.operand], ['ROUTE', 'PRINT NODE1']);
    });

    await t.test('M: Nick\'s item 8 is clean', () => {
        assert.deepEqual(diags(fs.readFileSync(path.join(__dirname, 'fixtures', 'nick', '08-jes2-route.jcl'), 'utf8')), []);
    });

    await t.test('O: a $ command is a JES2 statement', () => {
        assert.deepEqual(diags(JOB + "/*$VS,'D A'\n" + STEP), []);
    });

    await t.test('B: /*ROUTE inside DLM= data is data', () => {
        const source = JOB + STEP + '//IN DD *,DLM=$$\n/*ROUTE PRINT NODE1\n$$\n';
        assert.ok(lex(source).statements.every(s => s.type !== 'JES2'));
        assert.deepEqual(diags(source), []);
    });

    await t.test('B: /* followed by a blank still ends DD * data', () => {
        const source = JOB + STEP + '//IN DD *\nDATA\n/* END\n';
        assert.deepEqual(validate(source).ast.jobs[0].steps[0].dds[0].instreamData, ['DATA']);
        assert.ok(lex(source).statements.every(s => s.type !== 'JES2'));
    });

    await t.test('S: a production job with /*JOBPARM and /*ROUTE is clean', () => {
        const source = `//PAYROLL  JOB (ACCT),'J SMITH',CLASS=A,MSGCLASS=X
/*JOBPARM LINES=100
/*ROUTE PRINT RMT5
//STEP1    EXEC PGM=IEFBR14
`;
        assert.deepEqual(diags(source), []);
    });
});

test('JES2 statement checks', async (t) => {
    await t.test('I: an unknown statement gets JCLJ001 with a suggestion', () => {
        const [d] = validate(JOB + '/*ROUTEE PRINT NODE1\n' + STEP).diagnostics;
        assert.deepEqual([d.code, d.severity, d.line, d.column], ['JCLJ001', 'warning', 2, 3]);
        assert.equal(d.suggestion, "Did you mean 'ROUTE'?");
    });

    for (const route of ['/*ROUTE', '/*ROUTE PRNT NODE1', '/*ROUTE PRINT']) {
        await t.test(`E: '${route}' gets JCLJ002 listing the allowed values`, () => {
            const [d] = validate(JOB + route + '\n' + STEP).diagnostics;
            assert.equal(d.code, 'JCLJ002');
            assert.match(d.message, /PRINT, PUNCH or XEQ/);
        });
    }

    await t.test('E: ROUTE before JOB gets JCLJ003, not JCLL001', () => {
        assert.deepEqual(diags('/*ROUTE PRINT NODE1\n' + JOB + STEP), [['JCLJ003', 1, 1]]);
    });

    await t.test('E: PRIORITY after JOB gets JCLJ003; before JOB is clean', () => {
        assert.deepEqual(diags(JOB + '/*PRIORITY 5\n' + STEP), [['JCLJ003', 2, 1]]);
        assert.deepEqual(diags('/*PRIORITY 5\n' + JOB + STEP), []);
    });
});
