// MSGLEVEL values (Features.md feature 15).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');

const STEP = '//S EXEC PGM=IEFBR14\n';
const check = value => validate(`//J JOB MSGLEVEL=${value}\n` + STEP).diagnostics;

test('MSGLEVEL', async (t) => {
    await t.test('Z: no MSGLEVEL, no MSGLEVEL diagnostic', () => {
        assert.deepEqual(validate('//J JOB\n' + STEP).diagnostics, []);
    });

    for (const value of ['(1,1)', '1', '(2)', '(,0)', '(0,1)', '(2,1)']) {
        await t.test(`O/M/B: MSGLEVEL=${value} is accepted`, () => {
            assert.deepEqual(check(value), []);
        });
    }

    await t.test('B/I: (3,1) and (2,2) are rejected, naming the wrong sub-parameter', () => {
        assert.match(check('(3,1)')[0].message, /statements must be 0, 1 or 2; found '3'/);
        const [d] = check('(2,2)');
        assert.deepEqual([d.code, d.column], ['JCLS009', 18]);
        assert.equal(d.message, "MSGLEVEL messages must be 0 or 1; found '2'.");
    });

    await t.test('B: three sub-parameters are rejected', () => {
        assert.deepEqual(check('(1,1,1)').map(d => d.code), ['JCLS009']);
    });

    for (const value of ['()', '(A,B)', '(1,1']) {
        await t.test(`E: MSGLEVEL=${value} gets a clear diagnostic`, () => {
            assert.ok(check(value).some(d => d.code === 'JCLS009'));
        });
    }

    await t.test('S: (1,1,1,5) gets one warning explaining both sub-parameters; (1,1) is clean', () => {
        const diags = check('(1,1,1,5)');
        assert.equal(diags.length, 1);
        assert.match(diags[0].message, /at most 2 values \(statements and messages\)/);
        assert.deepEqual(check('(1,1)'), []);
    });
});
