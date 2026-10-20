// JCL carried inside DD DATA (Features.md feature 7).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../src/validator');

const job = body => `//J JOB\n//S EXEC PGM=IEBGENER\n${body}`;
const diags = source => validate(source).diagnostics.map(d => [d.code, d.severity, d.line]);

test('JCL inside DD DATA', async (t) => {
    await t.test('Z: DD DATA followed by /* is clean', () => {
        assert.deepEqual(diags(job('//IN DD DATA\n/*\n')), []);
    });

    await t.test('O: a // line in DD DATA is data, not a statement', () => {
        const result = validate(job('//IN DD DATA\n//X EXEC PGM=Y\n/*\n'));
        assert.deepEqual(result.diagnostics, []);
        assert.equal(result.ast.jobs[0].steps.length, 1);
        assert.deepEqual(result.ast.jobs[0].steps[0].dds[0].instreamData, ['//X EXEC PGM=Y']);
    });

    await t.test('M: Nick\'s item 14 has no errors, two DDs, and one internal reader note', () => {
        const result = validate(fs.readFileSync(path.join(__dirname, 'fixtures', 'nick', '14a-dd-data-jcl.jcl'), 'utf8'));
        assert.deepEqual(result.diagnostics.map(d => [d.code, d.severity, d.line]), [['JCLD004', 'info', 3]]);
        assert.deepEqual(result.ast.jobs[0].steps[0].dds.map(d => d.name), ['SYSUT1', 'SYSUT2']);
    });

    await t.test('B: the same lines under DD * end the data at the first // line', () => {
        const result = validate(job('//IN DD *\n//NESTED JOB\n'));
        assert.deepEqual(result.ast.jobs[0].steps[0].dds[0].instreamData, []);
        assert.equal(result.stats.jobCount, 2);
    });

    await t.test('I: no note without an INTRDR DD', () => {
        assert.deepEqual(diags(job('//IN DD DATA\n//N JOB\n/*\n//OUT DD SYSOUT=A\n')), []);
    });

    await t.test('I: no note without a JOB statement in the data', () => {
        assert.deepEqual(diags(job('//IN DD DATA\n//S EXEC PGM=X\n/*\n//OUT DD SYSOUT=(A,INTRDR)\n')), []);
    });

    await t.test('E: DD DATA with no /* gets JCLL006 and the nested JCL is not checked', () => {
        assert.deepEqual(diags(job('//IN DD DATA\n//N JOB BADKEY=1\n')).map(d => d[0]), ['JCLL006']);
    });

    await t.test('S: an IEBGENER job submitting a nested job has no errors or warnings', () => {
        const source = `//SUBMIT   JOB (ACCT),'ME',CLASS=A,MSGCLASS=X
//GEN      EXEC PGM=IEBGENER
//SYSPRINT DD   SYSOUT=*
//SYSIN    DD   DUMMY
//SYSUT1   DD   DATA
//NESTED   JOB (ACCT),'ME',CLASS=A
//STEP1    EXEC PGM=IEFBR14
/*
//SYSUT2   DD   SYSOUT=(A,INTRDR)
`;
        assert.deepEqual(diags(source), [['JCLD004', 'info', 5]]);
    });
});
