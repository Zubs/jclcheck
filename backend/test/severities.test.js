// Severity of real JCL errors (Features.md feature 34).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');
const { CATALOG } = require('../src/errors');

// Every code's default severity. Change this list only when a severity is
// meant to change.
const SEVERITIES = {
    error: [
        'JCLC001', 'JCLC002', 'JCLC003', 'JCLC004', 'JCLC005', 'JCLC006', 'JCLC007', 'JCLC008',
        'JCLD002', 'JCLD003', 'JCLD005', 'JCLD006',
        'JCLF001', 'JCLF005',
        'JCLG001', 'JCLG002', 'JCLG003', 'JCLG004', 'JCLG005', 'JCLG006', 'JCLG007', 'JCLG008', 'JCLG009', 'JCLG010',
        'JCLK002', 'JCLK003', 'JCLK004', 'JCLK007', 'JCLK009',
        'JCLL001', 'JCLL002', 'JCLL003', 'JCLL004', 'JCLL005',
        'JCLN001',
        'JCLO001', 'JCLO002', 'JCLO003', 'JCLO005', 'JCLO006', 'JCLO007', 'JCLO008', 'JCLO009', 'JCLO010', 'JCLO011',
        'JCLP001', 'JCLP002', 'JCLP003', 'JCLP004', 'JCLP005', 'JCLP006', 'JCLP007', 'JCLP008', 'JCLP009',
        'JCLR002', 'JCLR004', 'JCLR006', 'JCLR007', 'JCLR008',
        'JCLS001', 'JCLS006', 'JCLS007', 'JCLS008'
    ],
    warning: [
        'JCLD001', 'JCLD007',
        'JCLF002', 'JCLF003', 'JCLF004',
        'JCLJ001', 'JCLJ002', 'JCLJ003', 'JCLJ301', 'JCLJ302', 'JCLJ303', 'JCLJ304', 'JCLJ305',
        'JCLK001', 'JCLK005', 'JCLK006', 'JCLK008',
        'JCLL006',
        'JCLN002',
        'JCLR001', 'JCLR003', 'JCLR005',
        'JCLS002', 'JCLS003', 'JCLS004', 'JCLS005', 'JCLS009', 'JCLS010', 'JCLS011', 'JCLS012', 'JCLS013'
    ],
    info: ['JCLD004', 'JCLJ306', 'JCLS014', 'JCLX001', 'JCLX002']
};

const STEP = '//S EXEC PGM=X\n';

test('severities', async (t) => {
    await t.test('I: every code has its listed default severity', () => {
        const actual = {};
        for (const [code, entry] of Object.entries(CATALOG)) {
            (actual[entry.severity] ||= []).push(code);
        }

        for (const list of Object.values(actual)) {
            list.sort();
        }

        assert.deepEqual(actual, SEVERITIES);
    });

    await t.test('Z: JCL with no diagnostics is valid', () => {
        const result = validate(`//J JOB\n${STEP}//D DD DUMMY\n`);
        assert.deepEqual(result.diagnostics, []);
        assert.equal(result.stats.valid, true);
    });

    await t.test('O: an EXEC with no program is an error', () => {
        const result = validate("//J1   JOB (A),'X'\n//S1   EXEC REGION=4M\n//DD1  DD DUMMY\n");
        assert.deepEqual(result.diagnostics.map(d => [d.code, d.severity]), [['JCLK002', 'error']]);
        assert.equal(result.stats.valid, false);
        assert.equal(result.stats.errors, 1);
    });

    await t.test('M: one of each listed code is an error, and all are counted', () => {
        const jcl = [
            '//J JOB',
            '//S1 EXEC REGION=4M',
            '//S2 EXEC PGM=X,REGION=4M,X',
            '//D1 DD DSN=A.B,DISP=(BAD,KEEP)',
            `//D2 DD DSN=${'A.'.repeat(22)}B,DISP=SHR`,
            '//D3 DD DSN=A.TOOLONGQUAL.B,DISP=SHR',
            '//D4 DD DSN=A.1BAD.B,DISP=SHR'
        ].join('\n');
        const result = validate(jcl);
        const codes = result.diagnostics.map(d => [d.code, d.severity]);
        assert.deepEqual(codes, [
            ['JCLK002', 'error'], ['JCLK003', 'error'], ['JCLS001', 'error'],
            ['JCLS006', 'error'], ['JCLS007', 'error'], ['JCLS008', 'error']
        ]);
        assert.equal(result.stats.errors, 6);
    });

    await t.test('B: a 44-character dataset name is accepted, and 45 is an error', () => {
        const dd = dsn => validate(`//J JOB\n${STEP}//D DD DSN=${dsn},DISP=SHR\n`).diagnostics.map(d => [d.code, d.severity]);
        const name44 = `${'ABCDEFG.'.repeat(5)}ABC`;
        assert.equal(name44.length, 43);
        assert.deepEqual(dd(`${name44}D`), []);
        assert.deepEqual(dd(`${name44}DE`), [['JCLS006', 'error']]);
    });

    await t.test('E: DISP=&D inside a PROC gets no error', () => {
        const jcl = '//J JOB\n//P PROC D=SHR\n//S EXEC PGM=X\n//D DD DSN=A.B,DISP=&D\n// PEND\n//R EXEC P\n';
        assert.deepEqual(validate(jcl).diagnostics.filter(d => d.severity === 'error'), []);
    });
});
