// EXEC keywords qualified with a procedure step (Features.md feature 18).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../src/validator');

const PROC = '//J JOB\n//MYPROC PROC\n//S1 EXEC PGM=A\n//S2 EXEC PGM=B\n//  PEND\n';
const call = params => `${PROC}//RUN EXEC MYPROC,${params}\n`;
const codes = source => validate(source).diagnostics.map(d => d.code);

test('keywords qualified with a procedure step', async (t) => {
    await t.test('M: Nick\'s item 2 has no JCLK001 for its COND overrides', () => {
        const source = fs.readFileSync(path.join(__dirname, 'fixtures', 'nick', '02-continued-comment.jcl'), 'utf8');
        assert.deepEqual(codes(source), ['JCLR001']);
    });

    await t.test('O: REGION.S1 on a call to an in-stream PROC with S1 is clean', () => {
        assert.deepEqual(codes(call('REGION.S1=4M')), []);
    });

    await t.test('B: an 8-character step name passes the name rule and 9 gets JCLN001', () => {
        assert.deepEqual(codes('//J JOB\n//RUN EXEC CATPROC,REGION.ABCDEFGH=4M\n'), ['JCLR001']);
        assert.deepEqual(codes('//J JOB\n//RUN EXEC CATPROC,REGION.ABCDEFGHI=4M\n'), ['JCLR001', 'JCLN001']);
    });

    await t.test('E: REGON.S1 still gets a suggestion', () => {
        const d = validate(call('REGON.S1=4M')).diagnostics.find(x => x.code === 'JCLK001');
        assert.equal(d.suggestion, "Did you mean 'REGION'?");
    });

    await t.test('E: PGM.S1 gets JCLK008', () => {
        assert.deepEqual(codes(call('PGM.S1=X')), ['JCLK008']);
    });

    await t.test('O: the value is still checked', () => {
        assert.deepEqual(codes(call('REGION.S1=4X')), ['JCLS004']);
    });

    await t.test('I: an unknown step gets JCLR004 naming the PROC and its steps', () => {
        const [d] = validate(call('REGION.S9=4M')).diagnostics;
        assert.equal(d.code, 'JCLR004');
        assert.equal(d.message, "PROC MYPROC has no step 'S9'.");
        assert.equal(d.suggestion, 'Its steps are: S1, S2.');
    });

    await t.test('E: qualified keywords on EXEC PGM= get JCLK009', () => {
        const [d] = validate('//J JOB\n//S EXEC PGM=X,COND.S1=(4,LT)\n').diagnostics;
        assert.deepEqual([d.code, d.severity], ['JCLK009', 'error']);
        assert.deepEqual(codes('//J JOB\n//S EXEC PGM=X,COND.S1=\n'), ['JCLK009']);
    });

    await t.test('S: overriding REGION and COND for two steps is clean', () => {
        assert.deepEqual(codes(call('REGION.S1=4M,COND.S2=(4,LT),\n//             REGION.S2=8M')), []);
    });
});
