// Positional parameter limits (Features.md feature 12).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');

const STEP = '//S EXEC PGM=IEFBR14\n';
const diags = source => validate(source).diagnostics.map(d => [d.code, d.severity, d.column]);

test('positional parameter limits', async (t) => {
    await t.test('Z: //J JOB with no parameters is clean', () => {
        assert.deepEqual(diags('//J JOB\n' + STEP), []);
    });

    await t.test("O: //J JOB (ACCT) and //J JOB ,'NAME' are clean", () => {
        assert.deepEqual(diags('//J JOB (ACCT)\n' + STEP), []);
        assert.deepEqual(diags("//J JOB ,'NAME'\n" + STEP), []);
    });

    await t.test('M/I: Nick\'s item 16 gets one JCLK004 naming JOB, the limit and the count', () => {
        const result = validate('//CLEAN JOB ,,,,,,,,,,,,,,,MSGLEVEL=(1,1)\n');
        assert.deepEqual(result.diagnostics.map(d => [d.code, d.severity, d.line, d.column]), [['JCLK004', 'error', 1, 15]]);
        assert.match(result.diagnostics[0].message, /JOB statement allows at most 2 positional parameters .*; found 15\./);
    });

    await t.test('B: two positionals pass and three fail', () => {
        assert.deepEqual(diags("//J JOB (ACCT),'NAME'\n" + STEP), []);
        assert.deepEqual(diags("//J JOB (ACCT),'NAME',X\n" + STEP), [['JCLK004', 'error', 23]]);
    });

    await t.test('E: DD *,DUMMY gets JCLK004', () => {
        // DUMMY also conflicts with the in-stream data (JCLD003).
        assert.deepEqual(diags('//J JOB\n' + STEP + '//IN DD *,DUMMY\n/*\n').map(d => d[0]), ['JCLD003', 'JCLK004']);
    });

    await t.test('E: a positional after a keyword still gets JCLK003', () => {
        assert.deepEqual(diags('//J JOB CLASS=A,(ACCT)\n' + STEP), [['JCLK003', 'error', 17]]);
    });

    await t.test('S: a typical JOB statement is clean', () => {
        assert.deepEqual(diags("//PAYROLL JOB (ACCT),'J SMITH',CLASS=A\n" + STEP), []);
    });
});

test('JOB positional sizes', async (t) => {
    await t.test('B: a 20-character name passes and 21 gets JCLS012', () => {
        assert.deepEqual(diags(`//J JOB ACCT,'${'N'.repeat(20)}'\n` + STEP), []);
        assert.deepEqual(diags(`//J JOB ACCT,'${'N'.repeat(21)}'\n` + STEP), [['JCLS012', 'warning', 14]]);
    });

    await t.test('B: accounting information over 143 characters gets JCLS012', () => {
        // Three lines of seven 8-character fields: 168 characters inside the parentheses.
        const fields = 'ACCTFLD,'.repeat(7);
        const source = `//J JOB (${fields}\n//             ${fields}\n//             ${fields.slice(0, -1)})\n` + STEP;
        assert.deepEqual(diags(source).map(d => d[0]), ['JCLS012']);
    });

    await t.test('E: an unquoted name with special characters gets JCLS013', () => {
        assert.deepEqual(diags('//J JOB ACCT,J/SMITH\n' + STEP), [['JCLS013', 'warning', 14]]);
        assert.deepEqual(diags('//J JOB ACCT,J.SMITH\n' + STEP), []);
    });
});
