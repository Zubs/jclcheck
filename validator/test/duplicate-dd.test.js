// Duplicate DD names (Features.md feature 20).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');

const STEP = '//J JOB\n//S EXEC PGM=IEFBR14\n';
const dups = source => validate(source).diagnostics.filter(d => d.code === 'JCLD001');

test('duplicate DD names', async (t) => {
    await t.test('Z: a step with no DDs has no JCLD001', () => {
        assert.deepEqual(dups(STEP), []);
    });

    await t.test('O/S: Nick\'s item 18 gives one warning and is valid', () => {
        const result = validate('//NICK     JOB\n//STEP1    EXEC PGM=IEFBR14\n//SYSUT2   DD SYSOUT=*\n//SYSUT2   DD SYSOUT=A\n');
        assert.deepEqual(result.diagnostics.map(d => [d.code, d.severity, d.line]), [['JCLD001', 'warning', 4]]);
        assert.equal(result.stats.valid, true);
        assert.deepEqual([result.stats.errors, result.stats.warnings], [0, 1]);
        assert.match(result.diagnostics[0].message, /allocates both/);
        assert.match(result.diagnostics[0].message, /reaches only the first one/);
    });

    await t.test('M: three DDs with the same name give two warnings', () => {
        assert.equal(dups(STEP + '//A DD DUMMY\n//A DD DUMMY\n//A DD DUMMY\n').length, 2);
    });

    await t.test('B: the same name in two steps gives no warning', () => {
        assert.deepEqual(dups(STEP + '//A DD DUMMY\n//S2 EXEC PGM=X\n//A DD DUMMY\n'), []);
    });

    await t.test('E: names differing only in case are the same name', () => {
        assert.equal(dups(STEP + '//sysut2 DD DUMMY\n//SYSUT2 DD DUMMY\n').length, 1);
    });
});
