// Keyword value rules (Features.md feature 14).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');
const { checkValue, oneOfValues, integer, char, name, quoted, list, oneOf } = require('../src/valueRules');

const STEP = '//S EXEC PGM=IEFBR14\n';
const diags = (source, options) => validate(source, options).diagnostics.map(d => [d.code, d.column]);

test('rule types', async (t) => {
    await t.test('enum, integer, char, name and quoted', () => {
        assert.equal(checkValue(oneOfValues('A', 'B'), 'b'), null);
        assert.equal(checkValue(oneOfValues('SCAN'), 'SCAM').closest, 'SCAN');
        assert.equal(checkValue(integer(1, 9), '9'), null);
        assert.match(checkValue(integer(1, 9), 'x').detail, /whole number from 1 to 9/);
        assert.equal(checkValue(integer(0, 2), '3').detail, 'must be 0, 1 or 2');
        assert.equal(checkValue(char(/^[A-Z]$/, 'a letter'), 'Q'), null);
        assert.equal(checkValue(name(/^[A-Z]{1,8}$/, 'a name'), 'TOOLONGNAME').detail, 'must be a name');
        assert.equal(checkValue(quoted(3), "'A''B'"), null);
        assert.ok(checkValue(quoted(3), "'ABCD'"));
    });

    await t.test('list positions, labels, omitted positions and too many entries', () => {
        const rule = list([{ label: 'first', rule: integer(0, 2) }, { label: 'second', rule: integer(0, 1) }], { atLeastOne: true });
        assert.equal(checkValue(rule, '(1,1)'), null);
        assert.equal(checkValue(rule, '(,0)'), null);
        assert.equal(checkValue(rule, '2'), null);
        assert.equal(checkValue(rule, '(2,2)').detail, 'second must be 0 or 1');
        assert.match(checkValue(rule, '(1,1,1)').detail, /at most 2 values \(first and second\)/);
        assert.ok(checkValue(rule, '()'));
        assert.ok(checkValue(rule, '(1,1'));
    });

    await t.test('oneOf passes when any rule passes', () => {
        const rule = oneOf(integer(0, 9), oneOfValues('ALL'));
        assert.equal(checkValue(rule, 'ALL'), null);
        assert.equal(checkValue(rule, '5'), null);
        assert.match(checkValue(rule, 'X').detail, /whole number from 0 to 9, or must be one of ALL/);
    });
});

test('keyword values', async (t) => {
    await t.test('Z: a keyword with no rule accepts any value', () => {
        assert.deepEqual(diags('//J JOB USER=ANYTHING\n' + STEP), []);
    });

    await t.test('O: TYPRUN=SCAN passes and TYPRUN=SCAM gets JCLS009 with a suggestion', () => {
        assert.deepEqual(diags('//J JOB TYPRUN=SCAN\n' + STEP), []);
        const [d] = validate('//J JOB TYPRUN=SCAM\n' + STEP).diagnostics;
        assert.deepEqual([d.code, d.severity, d.suggestion], ['JCLS009', 'warning', "Did you mean 'SCAN'?"]);
        assert.equal(d.message, "TYPRUN must be one of SCAN, HOLD, JCLHOLD, COPY; found 'SCAM'.");
    });

    await t.test('M: five bad JOB values give five warnings at their own values', () => {
        const source = '//J JOB CLASS=AB,MSGCLASS=%,TYPRUN=NOW,PRTY=99,ADDRSPC=BIG\n' + STEP;
        assert.deepEqual(diags(source), [['JCLS009', 15], ['JCLS009', 27], ['JCLS009', 36], ['JCLS009', 45], ['JCLS009', 56]]);
    });

    await t.test('B: PRTY 0 and 15 pass; -1 and 16 fail', () => {
        assert.deepEqual(diags('//J JOB PRTY=0\n' + STEP), []);
        assert.deepEqual(diags('//J JOB PRTY=15\n' + STEP), []);
        assert.deepEqual(diags('//J JOB PRTY=-1\n' + STEP), [['JCLS009', 14]]);
        assert.deepEqual(diags('//J JOB PRTY=16\n' + STEP), [['JCLS009', 14]]);
    });

    await t.test('B/I: CLASS=A passes; CLASS=AB fails at the value with what is allowed', () => {
        assert.deepEqual(diags('//J JOB CLASS=A\n' + STEP), []);
        const [d] = validate('//J JOB CLASS=AB\n' + STEP).diagnostics;
        assert.equal(d.column, 15);
        assert.match(d.message, /one character A-Z or 0-9/);
    });

    await t.test('E: an empty value gets JCLS009 without a crash', () => {
        assert.deepEqual(diags('//J JOB CLASS=\n' + STEP), [['JCLS009', 15]]);
    });

    await t.test('E: a symbolic value in a PROC is not checked', () => {
        const source = '//J JOB\n//P PROC MYCLASS=A\n//PS EXEC PGM=X,ADDRSPC=&MYCLASS\n//  PEND\n//S EXEC P\n';
        assert.deepEqual(diags(source), []);
    });

    await t.test('O: DD and EXEC rules apply', () => {
        assert.deepEqual(diags('//J JOB\n//S EXEC PGM=X,RD=XX\n//D DD DSN=A.B,DISP=SHR,FREE=NOW\n'), [['JCLS009', 19], ['JCLS009', 30]]);
    });

    await t.test('E: a bad JES3 MAIN HOLD value gets JCLS009', () => {
        assert.deepEqual(diags('//J JOB\n//*MAIN HOLD=MAYBE\n' + STEP, { jes: 'JES3', zosLevel: '2.5' }), [['JCLS009', 14]]);
    });
});
