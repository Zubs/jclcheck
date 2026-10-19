// The NOTIFY statement and EMAIL= (Features.md feature 17).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');
const { checkValue, email } = require('../src/valueRules');

const JOB = '//J JOB\n';
const STEP = '//S EXEC PGM=IEFBR14\n';
const diags = source => validate(source).diagnostics.map(d => [d.code, d.line, d.column]);
const codes = source => validate(source).diagnostics.map(d => d.code);

test('email rule', async (t) => {
    await t.test('B: 246 characters pass, 247 fail', () => {
        const at = n => `'${'a'.repeat(n - 6)}@b.com'`;
        assert.equal(checkValue(email(246), at(246)), null);
        assert.ok(checkValue(email(246), at(247)));
    });

    await t.test('E: no @, two @ and no quotes fail', () => {
        for (const v of ["'nick'", "'a@b@c'", 'nick@x.com']) {
            assert.ok(checkValue(email(246), v), v);
        }
    });
});

test('NOTIFY statement', async (t) => {
    await t.test('Z: no parameters gets JCLK002 asking for EMAIL or USER', () => {
        const [d] = validate(JOB + '//N1 NOTIFY\n' + STEP).diagnostics;
        assert.equal(d.code, 'JCLK002');
        assert.match(d.message, /EMAIL or USER/);
    });

    await t.test('O: USER only is clean', () => {
        assert.deepEqual(diags(JOB + '//N1 NOTIFY USER=IBMUSER\n' + STEP), []);
    });

    await t.test('M: three mixed NOTIFY statements are clean', () => {
        const source = JOB + "//N1 NOTIFY USER=IBMUSER\n//N2 NOTIFY EMAIL='a@b.com',TYPE=EMAIL\n//N3 NOTIFY USER=OPS,TYPE=MSG\n" + STEP;
        assert.deepEqual(diags(source), []);
    });

    await t.test('B: nine NOTIFY statements give JCLO010 on the ninth', () => {
        const source = JOB + '//N NOTIFY USER=IBMUSER\n'.repeat(9) + STEP;
        assert.deepEqual(diags(source), [['JCLO010', 10, 5]]);
    });

    await t.test('E: a NOTIFY after the first EXEC gets JCLO009', () => {
        assert.deepEqual(diags(JOB + STEP + '//N1 NOTIFY USER=IBMUSER\n'), [['JCLO009', 3, 6]]);
    });

    await t.test('E: EMAIL and USER together get JCLK007', () => {
        const [d] = validate(JOB + "//N1 NOTIFY EMAIL='a@b.com',USER=IBMUSER\n" + STEP).diagnostics;
        assert.deepEqual([d.code, d.severity], ['JCLK007', 'error']);
    });

    await t.test('I: Nick\'s item 12 gets JCLS009 on TYPE listing MSG and EMAIL', () => {
        const [d] = validate('//NICK     JOB\n//N1   NOTIFY USER=IBMUSER,TYPE=EMAILaasdasd\n').diagnostics;
        assert.deepEqual([d.code, d.line, d.column], ['JCLS009', 2, 33]);
        assert.match(d.message, /must be one of MSG, EMAIL/);
    });

    await t.test("E: EMAIL='nick' and an unquoted address fail with a clear fix", () => {
        const [d] = validate(JOB + "//N1 NOTIFY EMAIL='nick'\n" + STEP).diagnostics;
        assert.match(d.message, /e-mail address in quotes, at most 246 characters, with one @/);
        assert.deepEqual(codes(JOB + '//N1 NOTIFY EMAIL=nick@x.com\n' + STEP), ['JCLS009']);
    });

    await t.test("E: EMAIL='nick' on the JOB statement fails", () => {
        assert.deepEqual(codes("//J JOB EMAIL='nick'\n" + STEP), ['JCLS009']);
    });

    await t.test('O/E: WHEN=(RC>4) passes and WHEN=(RC => 4) gets JCLC001', () => {
        assert.deepEqual(diags(JOB + '//N1 NOTIFY USER=IBMUSER,WHEN=(RC>4)\n' + STEP), []);
        assert.deepEqual(codes(JOB + '//N1 NOTIFY USER=IBMUSER,WHEN=(RC => 4)\n' + STEP), ['JCLC001']);
    });
});
