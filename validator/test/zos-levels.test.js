// Checking JCL against a chosen z/OS level (Features.md feature 3).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');
const { makeDiagnostic } = require('../src/errors');
const { checkKeywords } = require('../src/rules/paramRules');
const { table } = require('../src/keywords');
const { expectDiagnostics } = require('./helpers/diagnostics');

const ITEM_10 = `//RARE JOB MSGLEVEL=(1,1),EMAIL='nick-becker@themagicmainframe.com'
//STEP1 EXEC PGM=IEFBR14
`;

// The real tables have no marks after the oldest level yet, so the
// boundaries are checked against a small table of their own.
const TEST_TABLE = table(['OLD', 'NEWER', 'GONE'], {
    NEWER: { since: '2.4' },
    GONE: { until: '2.5' }
});

function keywordDiagnostics(key, zosLevel) {
    const diagnostics = [];
    checkKeywords([{ kind: 'keyword', key, value: 'X', col: 10 }], TEST_TABLE, 'JOB', 1, diagnostics, zosLevel);
    return diagnostics;
}

test('z/OS level in the validator', async (t) => {
    await t.test('Z: with no level the newest is used and reported', () => {
        assert.equal(validate('').zosLevel, '3.2');
    });

    await t.test('O: EMAIL= on the JOB statement is accepted at z/OS 2.3', () => {
        const result = expectDiagnostics(ITEM_10, [], { valid: true });
        assert.equal(result.zosLevel, '3.2');
        assert.deepEqual(validate(ITEM_10, { zosLevel: '2.3' }).diagnostics, []);
    });

    await t.test('B: a keyword marked since the next level gets JCLK005 one level early', () => {
        assert.deepEqual(keywordDiagnostics('NEWER', '2.4'), []);
        const [d] = keywordDiagnostics('NEWER', '2.3');
        assert.equal(d.code, 'JCLK005');
        assert.equal(d.severity, 'warning');
        assert.equal(d.column, 10);
        assert.deepEqual(keywordDiagnostics('OLD', '2.3'), []);
    });

    await t.test('B: an entry marked until 2.5 is accepted at 2.5 and reported as removed at 3.1', () => {
        assert.deepEqual(keywordDiagnostics('GONE', '2.5'), []);
        const [d] = keywordDiagnostics('GONE', '3.1');
        assert.equal(d.code, 'JCLK005');
        assert.match(d.message, /removed after z\/OS 2\.5/);
    });

    await t.test('M: two levels differ only for keywords marked between them', () => {
        const at23 = ['OLD', 'NEWER', 'GONE'].flatMap(k => keywordDiagnostics(k, '2.3'));
        const at32 = ['OLD', 'NEWER', 'GONE'].flatMap(k => keywordDiagnostics(k, '3.2'));
        assert.deepEqual(at23.map(d => d.message), ["'NEWER' on the JOB statement is available from z/OS 2.4. You are checking against z/OS 2.3."]);
        assert.deepEqual(at32.map(d => d.message), ["'GONE' on the JOB statement was removed after z/OS 2.5. You are checking against z/OS 3.2."]);
    });

    await t.test('I: JCLK005 names the keyword, statement and both levels, and suggests a newer level', () => {
        const d = makeDiagnostic('JCLK005', { kind: 'keyword', name: 'EMAIL', stmt: 'JOB', reason: 'since', at: '2.3', level: '2.2' }, { line: 1 });
        assert.equal(d.message, "'EMAIL' on the JOB statement is available from z/OS 2.3. You are checking against z/OS 2.2.");
        assert.equal(d.suggestion, "Choose z/OS 2.3 or later, or remove 'EMAIL'.");
        assert.equal(d.severity, 'warning');
        const s = makeDiagnostic('JCLK005', { kind: 'statement', name: 'NOTIFY', reason: 'since', at: '2.3', level: '2.2' }, { line: 1 });
        assert.equal(s.message, 'The NOTIFY statement is available from z/OS 2.3. You are checking against z/OS 2.2.');
    });

    await t.test('E: a misspelt keyword still gets JCLK001 with a suggestion, not JCLK005', () => {
        const result = validate("//J JOB EMAILL='a@b.com'\n//S EXEC PGM=IEFBR14\n", { zosLevel: '2.3' });
        assert.deepEqual(result.diagnostics.map(d => d.code), ['JCLK001']);
        assert.equal(result.diagnostics[0].suggestion, "Did you mean 'EMAIL'?");
    });

    await t.test('E: an unknown level is refused rather than silently replaced', () => {
        assert.throws(() => validate('', { zosLevel: '9.9' }), /Unknown z\/OS level/);
    });
});
