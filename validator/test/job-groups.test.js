// JES2 job groups (Features.md feature 22).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../src/validator');

const diags = source => validate(source).diagnostics.map(d => [d.code, d.line]);
const codes = source => validate(source).diagnostics.map(d => d.code);

test('job groups', async (t) => {
    await t.test('O: one GJOB with a matching ENDGROUP is clean', () => {
        assert.deepEqual(diags('//G JOBGROUP\n//A GJOB\n//G ENDGROUP\n'), []);
    });

    await t.test('M: Nick\'s item 5 is clean', () => {
        const source = fs.readFileSync(path.join(__dirname, 'fixtures', 'nick', '05-jobgroup.jcl'), 'utf8');
        const result = validate(source);
        assert.deepEqual(result.diagnostics, []);
        assert.deepEqual(result.ast.jobGroups[0].jobs.map(j => j.name), ['A', 'B', 'C', 'D']);
    });

    await t.test('B: 8-character job names pass and 9 get JCLN001', () => {
        assert.deepEqual(diags('//G JOBGROUP\n//ABCDEFGH GJOB\n//G ENDGROUP\n'), []);
        assert.deepEqual(codes('//G JOBGROUP\n//ABCDEFGHI GJOB\n//G ENDGROUP\n'), ['JCLN001']);
    });

    await t.test('E: a mismatched ENDGROUP, a missing ENDGROUP and a lone ENDGROUP', () => {
        assert.deepEqual(diags('//G JOBGROUP\n//A GJOB\n//H ENDGROUP\n'), [['JCLG001', 3]]);
        assert.deepEqual(diags('//G JOBGROUP\n//A GJOB\n'), [['JCLG002', 1]]);
        // With no job either, the stream also lacks a JOB statement.
        assert.deepEqual(diags('//G ENDGROUP\n'), [['JCLO001', 1], ['JCLG003', 1]]);
    });

    await t.test('O: a closed JOBSET with SJOBs is clean; SJOB outside a set is not', () => {
        assert.deepEqual(diags('//G JOBGROUP\n//S JOBSET\n//A SJOB\n//B SJOB\n// ENDSET\n//G ENDGROUP\n'), []);
        assert.deepEqual(codes('//G JOBGROUP\n//A SJOB\n//G ENDGROUP\n'), ['JCLG006']);
    });

    await t.test('E: a duplicate job name gets JCLG004', () => {
        assert.deepEqual(diags('//G JOBGROUP\n//A GJOB\n//A GJOB\n//G ENDGROUP\n'), [['JCLG004', 3]]);
    });

    await t.test('E: AFTER before any GJOB gets JCLG007', () => {
        assert.deepEqual(codes('//G JOBGROUP\n// AFTER NAME=A\n//A GJOB\n//G ENDGROUP\n'), ['JCLG007']);
    });

    await t.test('E: a group statement outside a group gets JCLG010', () => {
        assert.deepEqual(codes('//A GJOB\n'), ['JCLO001', 'JCLG010']);
    });

    await t.test('I: AFTER NAME=Z gets JCLG008 on its line, listing the jobs', () => {
        const source = '//G JOBGROUP\n//A GJOB\n//B GJOB\n// AFTER NAME=Z\n//G ENDGROUP\n';
        const [d] = validate(source).diagnostics;
        assert.deepEqual([d.code, d.line, d.column], ['JCLG008', 4, 15]);
        assert.equal(d.suggestion, "The group's jobs are: A, B.");
    });

    await t.test('E: a three-job cycle is reported once, naming all three', () => {
        const source = '//G JOBGROUP\n//A GJOB\n// AFTER NAME=C\n//B GJOB\n// AFTER NAME=A\n//C GJOB\n// AFTER NAME=B\n//G ENDGROUP\n';
        const cycles = validate(source).diagnostics.filter(d => d.code === 'JCLG009');
        assert.equal(cycles.length, 1);
        assert.match(cycles[0].message, /A → B → C → A/);
    });

    await t.test('E: a bad WHEN gets JCLC001', () => {
        assert.deepEqual(codes('//G JOBGROUP\n//A GJOB\n//B GJOB\n// AFTER NAME=A,WHEN=(RC=>0)\n//G ENDGROUP\n'), ['JCLC001']);
    });

    await t.test('S: a group plus a job joining it with SCHEDULE is clean', () => {
        const source = fs.readFileSync(path.join(__dirname, 'fixtures', 'nick', '05-jobgroup.jcl'), 'utf8') +
            '//A        JOB\n//         SCHEDULE JOBGROUP=MULTI\n//STEP1    EXEC PGM=IEFBR14\n';
        assert.deepEqual(diags(source), []);
    });
});
