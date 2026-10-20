// JCLLIB placement and contents (Features.md feature 11).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../src/validator');

const diags = source => validate(source).diagnostics.map(d => [d.code, d.line, d.column]);
const ITEM_17 = fs.readFileSync(path.join(__dirname, 'fixtures', 'nick', '17-jcllib-placement.jcl'), 'utf8');

test('JCLLIB placement', async (t) => {
    await t.test('Z: a job with no JCLLIB has no JCLLIB diagnostics', () => {
        assert.deepEqual(diags('//J JOB\n//S EXEC PGM=X\n'), []);
    });

    await t.test('O/B: a JCLLIB directly after the JOB statement is clean', () => {
        assert.deepEqual(diags('//J JOB\n//LIBS JCLLIB ORDER=(MY.PROCS)\n//S EXEC PGM=X\n'), []);
    });

    await t.test('M: Nick\'s item 17 gets JCLO005 on line 4', () => {
        assert.deepEqual(diags(ITEM_17), [['JCLR001', 2, 1], ['JCLO005', 4, 12]]);
    });

    await t.test('B/I: a JCLLIB directly after the first EXEC gets JCLO005 with a fix saying where to go', () => {
        const d = validate('//J JOB\n//S EXEC PGM=X\n//LIBS JCLLIB ORDER=(MY.PROCS)\n').diagnostics.find(x => x.code === 'JCLO005');
        assert.deepEqual([d.line, d.severity], [3, 'error']);
        assert.match(d.suggestion, /between the JOB statement and the first EXEC/);
    });

    await t.test('S: moving the JCLLIB above the first EXEC clears JCLO005', () => {
        const lines = ITEM_17.split('\n');
        const moved = [lines[0], lines[3], lines[4], lines[1], lines[2]].join('\n') + '\n';
        assert.ok(!diags(moved).some(d => d[0] === 'JCLO005'));
    });

    await t.test('E: a second JCLLIB gets JCLO006', () => {
        assert.deepEqual(diags('//J JOB\n//L1 JCLLIB ORDER=A.B\n//L2 JCLLIB ORDER=C.D\n//S EXEC PGM=X\n'), [['JCLO006', 3, 6]]);
    });

    await t.test('E: a JCLLIB inside a PROC gets JCLO008', () => {
        const source = '//J JOB\n//P PROC\n//L JCLLIB ORDER=A.B\n//PS EXEC PGM=X\n//  PEND\n//S EXEC P\n';
        assert.deepEqual(diags(source).filter(d => d[0] === 'JCLO008'), [['JCLO008', 3, 5]]);
    });
});

test('JCLLIB contents', async (t) => {
    await t.test('E: a JCLLIB without ORDER= gets JCLK002', () => {
        const [d] = validate('//J JOB\n//LIBS JCLLIB\n//S EXEC PGM=X\n').diagnostics;
        assert.equal(d.code, 'JCLK002');
        assert.match(d.message, /ORDER/);
    });

    await t.test('E: a library over 44 characters gets JCLS006', () => {
        const lib = 'A2345678.B2345678.C2345678.D2345678.E2345678';
        assert.equal(lib.length + 2, 46);
        const source = `//J JOB\n//LIBS JCLLIB ORDER=(MY.PROCS,\n//             ${lib}.F)\n//S EXEC PGM=X\n`;
        assert.deepEqual(diags(source).map(d => d[0]), ['JCLS006']);
    });

    await t.test('I: JCLR001 names the JCLLIB libraries and stays a warning', () => {
        const source = '//J JOB\n//LIBS JCLLIB ORDER=(A.PROCS,B.PROCS,C.PROCS)\n//S EXEC NOTHERE\n';
        const [d] = validate(source).diagnostics;
        assert.deepEqual([d.code, d.severity], ['JCLR001', 'warning']);
        assert.match(d.message, /may be found in A\.PROCS or 2 other libraries/);
    });
});
