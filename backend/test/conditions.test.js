// Parsing IF conditions (Features.md feature 13).

const test = require('node:test');
const assert = require('node:assert');
const { parseCondition, conditionChars } = require('../src/conditions');

// Parses text as if it started at line 1, column 10.
const parse = text => parseCondition(conditionChars(text, 1, 10), { line: 1, col: 5 });
const codes = text => parse(text).errors.map(e => [e.code, e.col]);

test('IF conditions', async (t) => {
    await t.test('O: (STEP1.RC = 0) THEN has one step reference', () => {
        const { refs, errors } = parse('(STEP1.RC = 0) THEN');
        assert.deepEqual(errors, []);
        assert.deepEqual(refs.map(r => [r.step, r.procstep]), [['STEP1', null]]);
    });

    await t.test('M: AND, OR, NOT and brackets combine', () => {
        const { refs, errors } = parse('(S1.RC = 0 & ¬S2.ABEND) | S3.RUN THEN');
        assert.deepEqual(errors, []);
        assert.deepEqual(refs.map(r => r.step), ['S1', 'S2', 'S3']);
        assert.deepEqual(codes('NOT (RC GT 4 AND ABEND = FALSE) OR S1.P1.RC LE 8 THEN'), []);
    });

    await t.test('B: RC = 4095 passes and 4096 gets JCLC002 at the value', () => {
        assert.deepEqual(codes('RC = 4095 THEN'), []);
        assert.deepEqual(codes('RC = 4096 THEN'), [['JCLC002', 15]]);
    });

    await t.test('B: ABENDCC values', () => {
        assert.deepEqual(codes('ABENDCC = S0C4 THEN'), []);
        assert.deepEqual(codes('ABENDCC=U4095 THEN'), []);
        assert.deepEqual(codes('ABENDCC=S0C THEN').map(c => c[0]), ['JCLC003']);
        assert.deepEqual(codes('ABENDCC=U4096 THEN').map(c => c[0]), ['JCLC003']);
    });

    await t.test('E: a missing THEN gets JCLC006', () => {
        assert.deepEqual(codes('RC = 0').map(c => c[0]), ['JCLC006']);
    });

    await t.test('E/I: RC => 4 gets JCLC001 at the operator', () => {
        assert.deepEqual(codes('RC => 4 THEN'), [['JCLC001', 13]]);
    });

    await t.test('E: unbalanced brackets get JCLC001', () => {
        assert.deepEqual(codes('(RC = 0 THEN').map(c => c[0]), ['JCLC001']);
    });

    await t.test('E: odd input never crashes', () => {
        for (const text of ['', 'THEN', '()', 'RC =', 'RC = THEN', 'FOO THEN', '((((', 'RC = 0 & THEN', '% THEN']) {
            assert.ok(parse(text).errors.length > 0, text);
        }
    });
});
