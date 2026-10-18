const test = require('node:test');
const assert = require('node:assert');
const {
    compareDiagnostics,
    formatComparison,
    expectDiagnostics
} = require('./helpers/diagnostics');

function diag(code, severity, line, column, extra = {}) {
    return { code, severity, line, column, ...extra };
}

test('compareDiagnostics', async (t) => {
    await t.test('O: a single matching diagnostic passes', () => {
        const d = diag('JCLK001', 'warning', 4, 26);
        assert.ok(compareDiagnostics([d], [d]).ok);
    });

    await t.test('M: the same diagnostics in a different order pass', () => {
        const a = diag('JCLK001', 'warning', 4, 26);
        const b = diag('JCLD002', 'error', 8, 1);
        assert.ok(compareDiagnostics([a, b], [b, a]).ok);
    });

    await t.test('B: a column of 5 instead of 6 fails', () => {
        const result = compareDiagnostics(
            [diag('JCLS001', 'warning', 5, 5)],
            [diag('JCLS001', 'warning', 5, 6)]
        );
        assert.equal(result.ok, false);
    });

    await t.test('E: an extra diagnostic fails and is listed as unexpected', () => {
        const a = diag('JCLK001', 'warning', 4, 26);
        const extra = diag('JCLD002', 'error', 8, 1);
        const result = compareDiagnostics([a, extra], [a]);
        assert.equal(result.ok, false);
        assert.deepEqual(result.unexpected, [extra]);
        assert.deepEqual(result.missing, []);
    });

    await t.test('E: a missing diagnostic fails and is listed as missing', () => {
        const a = diag('JCLK001', 'warning', 4, 26);
        const gone = diag('JCLD002', 'error', 8, 1);
        const result = compareDiagnostics([a], [a, gone]);
        assert.equal(result.ok, false);
        assert.deepEqual(result.missing, [gone]);
        assert.deepEqual(result.unexpected, []);
    });

    await t.test('M: a duplicate diagnostic counts twice', () => {
        const d = diag('JCLD001', 'error', 6, 1);
        const result = compareDiagnostics([d, d], [d]);
        assert.equal(result.ok, false);
        assert.deepEqual(result.unexpected, [d]);
    });

    await t.test('I: a changed message or suggestion still passes', () => {
        const actual = diag('JCLK001', 'warning', 4, 26, { message: 'new wording', suggestion: 'new fix' });
        const expected = diag('JCLK001', 'warning', 4, 26, { message: 'old wording', suggestion: 'old fix' });
        assert.ok(compareDiagnostics([actual], [expected]).ok);
    });
});

test('formatComparison', async (t) => {
    await t.test('I: shows both lists with markers and all four fields', () => {
        const kept = diag('JCLK001', 'warning', 4, 26);
        const missing = diag('JCLS001', 'warning', 5, 6);
        const unexpected = diag('JCLS001', 'warning', 5, 5);
        const text = formatComparison([kept, unexpected], [kept, missing]);

        assert.match(text, /EXPECTED\s+\| ACTUAL/);
        assert.match(text, /- warning JCLS001 L5:6/);
        assert.match(text, /\+ warning JCLS001 L5:5/);
        assert.match(text, / {2}warning JCLK001 L4:26/);
        assert.match(text, /missing: 1 {3}\+ unexpected: 1/);
    });

    await t.test('Z: two empty lists show (none) on both sides', () => {
        assert.match(formatComparison([], []), /\(none\)\s+\| \(none\)/);
    });
});

test('expectDiagnostics', async (t) => {
    await t.test('Z: empty JCL has no diagnostics and is valid', () => {
        expectDiagnostics('', [], { valid: true });
    });

    await t.test('E: a wrong expectation throws with the side-by-side table', () => {
        assert.throws(
            () => expectDiagnostics('', [diag('JCLO001', 'error', 1, 1)]),
            (err) => {
                assert.ok(err instanceof assert.AssertionError);
                assert.match(err.message, /EXPECTED\s+\| ACTUAL/);
                assert.match(err.message, /- error JCLO001 L1:1/);
                return true;
            }
        );
    });

    await t.test('E: a wrong valid flag throws', () => {
        assert.throws(() => expectDiagnostics('', [], { valid: false }), assert.AssertionError);
    });
});
