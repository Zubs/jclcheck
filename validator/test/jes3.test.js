// JES3 control statements and the JES choice (Features.md feature 9).

const test = require('node:test');
const assert = require('node:assert');
const { lex } = require('../src/lexer');
const { validate } = require('../src/validator');

const JES3 = { jes: 'JES3', zosLevel: '2.5' };
const diags = (source, options = JES3) => validate(source, options).diagnostics.map(d => [d.code, d.severity, d.line]);
const JOB = "//J JOB (ACCT),'ME'\n";
const STEP = '//S EXEC PGM=IEFBR14\n';

test('JES choice', async (t) => {
    await t.test('Z: the default is JES2', () => {
        assert.equal(validate('').jes, 'JES2');
    });

    await t.test('B: JES3 can be chosen at 2.5 and not at 3.1', () => {
        assert.equal(validate('', JES3).jes, 'JES3');
        assert.throws(() => validate('', { jes: 'JES3', zosLevel: '3.1' }));
    });
});

test('JES3 statements', async (t) => {
    await t.test('O: //*MAIN CLASS=A after the JOB statement is clean', () => {
        const source = JOB + '//*MAIN CLASS=A\n' + STEP;
        assert.deepEqual(diags(source), []);
        assert.equal(lex(source, JES3).statements[1].type, 'JES3');
    });

    await t.test('M: valid MAIN, FORMAT and NETACCT statements are clean', () => {
        const source = JOB + '//*MAIN CLASS=A\n//*FORMAT PR,DDNAME=SYSPRINT,COPIES=2\n//*NETACCT PNAME=SMITH\n' + STEP;
        assert.deepEqual(diags(source), []);
    });

    await t.test('B: //*MAINFRAME NOTES and //* MAIN stay comments', () => {
        const source = JOB + '//*MAINFRAME NOTES\n//* MAIN\n' + STEP;
        assert.deepEqual(diags(source), []);
        assert.deepEqual(lex(source, JES3).statements.slice(1, 3).map(s => s.type), ['COMMENT', 'COMMENT']);
    });

    await t.test('O: lines between DATASET and ENDDATASET are data', () => {
        const source = JOB + '//*DATASET DDNAME=INPUT\nRECORD ONE\nRECORD TWO\n//*ENDDATASET\n' + STEP;
        assert.deepEqual(diags(source), []);
        assert.deepEqual(lex(source, JES3).statements[1].data, ['RECORD ONE', 'RECORD TWO']);
    });

    await t.test('O: //** is a JES3 command', () => {
        assert.deepEqual(diags(JOB + '//**MESSAGE,CN=01,HELLO\n' + STEP), []);
    });

    await t.test('I: //*MIAN CLASS=A gets JCLJ301 with a suggestion', () => {
        const [d] = validate(JOB + '//*MIAN CLASS=A\n' + STEP, JES3).diagnostics;
        assert.deepEqual([d.code, d.severity], ['JCLJ301', 'warning']);
        assert.match(d.suggestion, /Did you mean 'MAIN'\?/);
    });

    await t.test('E: an unknown keyword on MAIN gets JCLJ302', () => {
        const [d] = validate(JOB + '//*MAIN CLAS=A\n' + STEP, JES3).diagnostics;
        assert.deepEqual([d.code, d.column, d.suggestion], ['JCLJ302', 9, "Did you mean 'CLASS'?"]);
    });

    await t.test('E: DATASET without ENDDATASET gets JCLJ304', () => {
        assert.deepEqual(diags(JOB + STEP + '//*DATASET DDNAME=X\nDATA\n'), [['JCLJ304', 'warning', 3]]);
    });

    await t.test('E: MAIN after the first EXEC gets JCLJ303', () => {
        assert.deepEqual(diags(JOB + STEP + '//*MAIN CLASS=A\n'), [['JCLJ303', 'warning', 3]]);
    });

    await t.test('E: a JES2 statement in a JES3 job gets JCLJ305', () => {
        assert.deepEqual(diags(JOB + '/*ROUTE PRINT NODE1\n' + STEP), [['JCLJ305', 'warning', 2]]);
    });

    await t.test('Z: with JES2, //*MAIN is a comment with one info note', () => {
        assert.deepEqual(diags(JOB + '//*MAIN CLASS=A\n' + STEP, {}), [['JCLJ306', 'info', 2]]);
    });

    await t.test('S: a JES3 production job at z/OS 2.4 is clean', () => {
        const source = `//PAYROLL  JOB (ACCT123),'J SMITH',CLASS=A,MSGCLASS=X
//*MAIN    CLASS=BATCH,LINES=(50,W)
//*FORMAT  PR,DDNAME=SYSPRINT,DEST=RMT5,COPIES=2
//STEP010  EXEC PGM=IEFBR14
//SYSPRINT DD   SYSOUT=*
`;
        assert.deepEqual(diags(source, { jes: 'JES3', zosLevel: '2.4' }), []);
    });
});
