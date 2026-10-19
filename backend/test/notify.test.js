// NOTIFY= on the JOB statement (Features.md feature 16).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');

const STEP = '//S EXEC PGM=IEFBR14\n';
const check = value => validate(`//RARE JOB NOTIFY=${value}\n` + STEP).diagnostics.map(d => [d.code, d.column]);

test('NOTIFY= on the JOB statement', async (t) => {
    await t.test('Z: no NOTIFY, no NOTIFY diagnostic', () => {
        assert.deepEqual(validate('//J JOB\n' + STEP).diagnostics, []);
    });

    for (const value of ['&SYSUID', 'IBMUSER', 'ibmuser', 'N1.IBMUSER', 'ABCDEFGH']) {
        await t.test(`O/B: NOTIFY=${value} is accepted`, () => {
            assert.deepEqual(check(value), []);
        });
    }

    for (const value of ['IBMUSERRRRRRRR', 'laskdjasd1.&SYSUID', 'ABCDEFGHI', '1BMUSER', '']) {
        await t.test(`B/M/E: NOTIFY=${value} gets JCLS009 at the value`, () => {
            assert.deepEqual(check(value), [['JCLS009', 19]]);
        });
    }

    await t.test('I: the warning gives the length and character rules', () => {
        const [d] = validate('//RARE JOB NOTIFY=ABCDEFGHI\n' + STEP).diagnostics;
        assert.match(d.message, /1-8 letters, digits or \$#@ that starts with a letter or \$#@/);
    });
});
