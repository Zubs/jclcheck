// Inline suppressions and site profile (Features.md feature 37).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');
const { matches } = require('../src/profile');

const shown = (jcl, options) => validate(jcl, options).diagnostics.filter(d => !d.suppressed).map(d => [d.code, d.line]);
const hidden = (jcl, options) => validate(jcl, options).diagnostics.filter(d => d.suppressed).map(d => [d.code, d.line]);

const EXAMPLE = [
    '//J1   JOB',
    '//* JCLCHECK OFF-NEXT JCLK001',
    '//S1   EXEC PGM=MYPGM,LOCALKW=YES'
].join('\n');

test('inline suppressions', async (t) => {
    await t.test('Z: with no suppressions or profile, results are as before', () => {
        const jcl = '//J JOB\n//S EXEC PGM=X,REGON=1M\n//D DD DSN=A.B,DISP=SHR\n';
        const result = validate(jcl);
        assert.deepEqual(result.diagnostics.map(d => [d.code, d.line, d.suppressed]), [['JCLK001', 2, undefined]]);
        assert.equal(result.stats.suppressed, 0);
        assert.equal(result.stats.warnings, 1);
    });

    await t.test('O: OFF-NEXT hides JCLK001 and still returns it', () => {
        const result = validate(EXAMPLE);
        assert.deepEqual(result.diagnostics.map(d => [d.code, d.suppressed]), [['JCLK001', true]]);
        assert.equal(result.stats.warnings, 0);
        assert.equal(result.stats.suppressed, 1);
    });

    await t.test('M: OFF for two codes hides both until ON turns one back on', () => {
        const jcl = [
            '//J JOB',
            '//* JCLCHECK OFF JCLK001,JCLS009',
            '//S1 EXEC PGM=X,FOO=1,ADDRSPC=BAD',
            '//S2 EXEC PGM=X,BAR=1,ADDRSPC=BAD',
            '//* JCLCHECK ON JCLK001',
            '//S3 EXEC PGM=X,BAZ=1,ADDRSPC=BAD'
        ].join('\n');
        assert.deepEqual(hidden(jcl), [['JCLK001', 3], ['JCLS009', 3], ['JCLK001', 4], ['JCLS009', 4], ['JCLS009', 6]]);
        assert.deepEqual(shown(jcl), [['JCLK001', 6]]);
    });

    await t.test('B: OFF-NEXT covers every line of the next statement, and not the one after', () => {
        const jcl = [
            '//J JOB',
            '//* JCLCHECK OFF-NEXT JCLK001',
            '//S1 EXEC PGM=X,',
            '//         FOO=1',
            '//S2 EXEC PGM=X,BAR=1'
        ].join('\n');
        assert.deepEqual(hidden(jcl), [['JCLK001', 4]]);
        assert.deepEqual(shown(jcl), [['JCLK001', 5]]);
    });

    await t.test('I: suppressed errors are not counted and the job is valid', () => {
        const jcl = '//J JOB\n//* JCLCHECK OFF-NEXT JCLK002\n//S EXEC REGION=4M\n';
        const result = validate(jcl);
        assert.deepEqual(result.diagnostics.map(d => [d.code, d.severity, d.suppressed]), [['JCLK002', 'error', true]]);
        assert.equal(result.stats.errors, 0);
        assert.equal(result.stats.valid, true);
    });

    await t.test('E: an unknown code gets JCLX001, and no code at all too', () => {
        assert.deepEqual(shown('//J JOB\n//* JCLCHECK OFF JCLZ999\n//S EXEC PGM=X\n'), [['JCLX001', 2]]);
        const [d] = validate('//J JOB\n//* JCLCHECK OFF JCLZ999\n//S EXEC PGM=X\n').diagnostics;
        assert.equal(d.column, 18);
        assert.match(d.message, /'JCLZ999'/);
        assert.deepEqual(shown('//J JOB\n//* JCLCHECK OFF\n//S EXEC PGM=X\n'), [['JCLX001', 2]]);
    });

    await t.test('a suppression that hides nothing gets JCLX002', () => {
        assert.deepEqual(shown('//J JOB\n//* JCLCHECK OFF-NEXT JCLK001\n//S EXEC PGM=X\n'), [['JCLX002', 2]]);
    });

    await t.test('an OFF block ends with its job', () => {
        const jcl = [
            '//J1 JOB',
            '//* JCLCHECK OFF JCLK001',
            '//S1 EXEC PGM=X,FOO=1',
            '//J2 JOB',
            '//S2 EXEC PGM=X,FOO=1'
        ].join('\n');
        assert.deepEqual(hidden(jcl), [['JCLK001', 3]]);
        assert.deepEqual(shown(jcl), [['JCLK001', 5]]);
    });

    await t.test('an OFF before the JOB statement covers that job', () => {
        assert.deepEqual(shown('//* JCLCHECK OFF JCLK001\n//J1 JOB\n//S1 EXEC PGM=X,FOO=1\n'), []);
    });

    await t.test('the directive is a comment, so it changes nothing else', () => {
        assert.equal(validate(EXAMPLE).stats.statementCount, 2);
    });
});

test('site profile', async (t) => {
    const profile = { names: { job: 'AR*' }, allowed: { CLASS: ['A', 'B'] } };

    await t.test('S: a job named PAYROLL1 gets JCLN002 naming the pattern', () => {
        const [d, ...rest] = validate('//PAYROLL1 JOB CLASS=C\n//S EXEC PGM=X\n', { profile }).diagnostics;
        assert.equal(d.code, 'JCLN002');
        assert.equal(d.severity, 'warning');
        assert.equal(d.message, "Job name PAYROLL1 doesn't match the site pattern 'AR*'.");
        assert.deepEqual(rest.map(x => [x.code, x.message]), [['JCLN002', "CLASS=C isn't one of the site's allowed values: A, B."]]);
        assert.deepEqual(shown('//AR0001 JOB CLASS=B\n//S EXEC PGM=X\n', { profile }), []);
    });

    await t.test('step and DD names, % for one character', () => {
        const names = { step: ['STEP%%'], dd: 'D*' };
        assert.deepEqual(shown('//J JOB\n//STEP01 EXEC PGM=X\n//STEP1 EXEC PGM=X\n//DIN DD DUMMY\n//OUT DD DUMMY\n', { profile: { names } }),
            [['JCLN002', 3], ['JCLN002', 5]]);
    });

    await t.test('dsnPrefixes apply to new datasets only', () => {
        const jcl = '//J JOB\n//S EXEC PGM=X\n//A DD DSN=PROD.NEW,DISP=(NEW,CATLG)\n//B DD DSN=PROD.OLD,DISP=SHR\n//C DD DSN=AR.NEW,DISP=(NEW,CATLG)\n//T DD DSN=&&T,DISP=(NEW,DELETE)\n';
        const result = validate(jcl, { profile: { dsnPrefixes: ['AR'] } });
        assert.deepEqual(result.diagnostics.map(d => [d.code, d.line]), [['JCLN002', 3]]);
        assert.match(result.diagnostics[0].message, /starts with PROD, which isn't one of the site's prefixes: AR/);
    });

    await t.test('extraKeywords are accepted', () => {
        const jcl = '//J JOB LOCAL1=Y\n//S EXEC PGM=X,LOCALKW=YES\n//D DD DUMMY,SITEKW=1\n';
        assert.deepEqual(shown(jcl).map(d => d[0]), ['JCLK001', 'JCLK001', 'JCLK001']);
        assert.deepEqual(shown(jcl, { profile: { extraKeywords: { JOB: ['LOCAL1'], exec: 'LOCALKW', DD: ['SITEKW'] } } }), []);
    });

    await t.test('severity changes a code, or switches it off', () => {
        const jcl = '//J JOB\n//S EXEC PGM=X,REGON=1M\n';
        const raised = validate(jcl, { profile: { severity: { JCLK001: 'error' } } });
        assert.deepEqual(raised.diagnostics.map(d => d.severity), ['error']);
        assert.equal(raised.stats.valid, false);
        assert.deepEqual(validate(jcl, { profile: { severity: { JCLK001: 'off' } } }).diagnostics, []);
    });

    await t.test('E: an invalid profile throws, naming the field', () => {
        assert.throws(() => validate('//J JOB\n', { profile: { names: { job: 5 } } }), /profile\.names\.job/);
        assert.throws(() => validate('//J JOB\n', { profile: { colour: 'red' } }), /profile\.colour isn't a profile field/);
        assert.throws(() => validate('//J JOB\n', { profile: { severity: { JCLZ999: 'off' } } }), /isn't a diagnostic code/);
        assert.throws(() => validate('//J JOB\n', { profile: { severity: { JCLK001: 'loud' } } }), /must be one of/);
    });

    await t.test('E: a pattern of 1,000 * characters is quick', () => {
        const started = Date.now();
        assert.equal(matches('*'.repeat(1000) + 'X', 'A'.repeat(1000)), false);
        assert.equal(matches(`${'*'.repeat(1000)}A`, 'BA'), true);
        assert.ok(Date.now() - started < 100);
    });

    await t.test('wildcards', () => {
        assert.equal(matches('AR*', 'ARJOB'), true);
        assert.equal(matches('AR*', 'XAR'), false);
        assert.equal(matches('A%C', 'ABC'), true);
        assert.equal(matches('A%C', 'AC'), false);
        assert.equal(matches('*B*', 'ABC'), true);
        assert.equal(matches('ab', 'AB'), true);
    });
});
