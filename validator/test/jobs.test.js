// Several jobs in one job stream (Features.md feature 10).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../src/validator');

const diags = source => validate(source).diagnostics.map(d => [d.code, d.line]);

const TWO_JOBS = `//JOB1 JOB
//STEP1 EXEC PGM=IEBGENER
//SYSUT1 DD DSN=A.B,DISP=SHR
//JOB2 JOB
//STEP1 EXEC PGM=IEBGENER
//SYSUT1 DD DSN=C.D,DISP=SHR
`;

test('jobs in a stream', async (t) => {
    await t.test('Z: input with no JOB statement gets JCLO001 once', () => {
        const codes = diags('//S1 EXEC PGM=X\n//S2 EXEC PGM=Y\n').map(d => d[0]);
        assert.equal(codes.filter(c => c === 'JCLO001').length, 1);
    });

    await t.test('O: one job is checked as before, with jobCount 1', () => {
        const result = validate('//J JOB\n//S EXEC PGM=X\n');
        assert.deepEqual(result.diagnostics, []);
        assert.equal(result.stats.jobCount, 1);
        assert.equal(result.ast.jobs.length, 1);
    });

    await t.test('M: Nick\'s item 4 gives two jobs and no diagnostics', () => {
        const result = validate(fs.readFileSync(path.join(__dirname, 'fixtures', 'nick', '04-multiple-jobs.jcl'), 'utf8'));
        assert.deepEqual(result.diagnostics, []);
        assert.equal(result.stats.jobCount, 2);
    });

    await t.test('M: the same step and DD names in two jobs are not duplicates', () => {
        assert.deepEqual(diags(TWO_JOBS), []);
    });

    await t.test('I: a diagnostic in job 2 points to its own line, and stepCount totals both jobs', () => {
        const result = validate(TWO_JOBS.replace('//STEP1 EXEC PGM=IEBGENER\n//SYSUT1 DD DSN=C.D', '//STEP1 EXEC PGM=IEBGENER,BADKEY=1\n//SYSUT1 DD DSN=C.D'));
        assert.deepEqual(result.diagnostics.map(d => [d.code, d.line]), [['JCLK001', 5]]);
        assert.equal(result.stats.stepCount, 2);
    });

    await t.test('B: // after the last statement is clean', () => {
        assert.deepEqual(diags('//J JOB\n//S EXEC PGM=X\n//\n'), []);
    });

    await t.test('B: // then a JOB starts the second job cleanly', () => {
        const result = validate('//J1 JOB\n//S EXEC PGM=X\n//\n//J2 JOB\n//S EXEC PGM=Y\n');
        assert.deepEqual(result.diagnostics, []);
        assert.equal(result.stats.jobCount, 2);
    });

    await t.test('E: an EXEC after // and before the next JOB gets JCLO007', () => {
        assert.deepEqual(diags('//J JOB\n//S EXEC PGM=X\n//\n//S2 EXEC PGM=Y\n'), [['JCLO007', 4]]);
    });

    await t.test('E: a step in job 2 calling a PROC from job 1 gets JCLR001', () => {
        const source = '//J1 JOB\n//P PROC\n//PS EXEC PGM=X\n//  PEND\n//S EXEC P\n//J2 JOB\n//S EXEC P\n';
        assert.deepEqual(diags(source), [['JCLR001', 7]]);
    });

    // z/OS rejects it (feature 41), but the call still resolves.
    await t.test('E: a PROC before the first JOB gets JCLO011 and still belongs to it', () => {
        assert.deepEqual(diags('//P PROC\n//PS EXEC PGM=X\n//  PEND\n//J1 JOB\n//S EXEC P\n'), [['JCLO011', 1]]);
    });

    await t.test('a PROC with no JOB at all is not JCLO011', () => {
        assert.ok(!diags('//P PROC\n//PS EXEC PGM=X\n//  PEND\n').some(d => d[0] === 'JCLO011'));
    });

    await t.test('S: three jobs report each mistake on its own line', () => {
        const source = `//J1 JOB
//S EXEC PGM=X,REGON=4M
//J2 JOB
//S EXEC PGM=X,TIME=ABC
//J3 JOB
//S EXEC PGM=X
//D DD DISP=SHR
`;
        const result = validate(source);
        assert.deepEqual(result.diagnostics.map(d => [d.code, d.line]), [['JCLK001', 2], ['JCLS005', 4], ['JCLD002', 7]]);
        assert.equal(result.stats.jobCount, 3);
    });

    await t.test('O: /*PRIORITY before the second job is in place', () => {
        assert.deepEqual(diags('//J1 JOB\n//S EXEC PGM=X\n/*PRIORITY 5\n//J2 JOB\n//S EXEC PGM=Y\n'), []);
    });
});
