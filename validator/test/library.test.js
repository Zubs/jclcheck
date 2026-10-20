// Catalogued procedures and INCLUDE members from the library (Features.md feature 23).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../src/validator');

const diags = (source, library) => validate(source, { library }).diagnostics
    .map(d => [d.code, d.line, ...(d.member ? [d.member] : [])]);

test('INCLUDE members', async (t) => {
    await t.test('M: nested includes are checked as if written in place', () => {
        const library = [
            { member: 'DDS1', source: '//IN DD DSN=A.B,DISP=SHR\n//  INCLUDE MEMBER=DDS3\n' },
            { member: 'DDS2', source: '//OUT DD SYSOUT=*\n' },
            { member: 'DDS3', source: '//LOG DD SYSOUT=*\n' }
        ];
        const source = '//J JOB\n//S EXEC PGM=X\n//  INCLUDE MEMBER=DDS1\n//  INCLUDE MEMBER=DDS2\n';
        const result = validate(source, { library });
        assert.deepEqual(result.diagnostics, []);
        assert.deepEqual(result.ast.jobs[0].steps[0].dds.map(d => d.name), ['IN', 'LOG', 'OUT']);
    });

    await t.test('B: 15 levels of includes pass and 16 get JCLR007', () => {
        const chain = n => Array.from({ length: n }, (_, i) => ({
            member: `M${i + 1}`,
            source: i + 1 < n ? `//  INCLUDE MEMBER=M${i + 2}\n` : '//D DD DUMMY\n'
        }));
        const source = '//J JOB\n//S EXEC PGM=X\n//  INCLUDE MEMBER=M1\n';
        assert.deepEqual(diags(source, chain(15)), []);
        assert.deepEqual(diags(source, chain(16)).map(d => d[0]), ['JCLR007']);
    });

    await t.test('E: a member that includes itself gets one JCLR006', () => {
        const library = [{ member: 'LOOP', source: '//  INCLUDE MEMBER=LOOP\n' }];
        const found = diags('//J JOB\n//S EXEC PGM=X\n//  INCLUDE MEMBER=LOOP\n', library);
        assert.deepEqual(found.map(d => d[0]), ['JCLR006']);
    });

    await t.test('E: a JOB statement in a member gets JCLR008 against the member', () => {
        const library = [{ member: 'BAD', source: '//X JOB\n' }];
        assert.deepEqual(diags('//J JOB\n//S EXEC PGM=X\n//  INCLUDE MEMBER=BAD\n', library), [['JCLR008', 1, 'BAD']]);
    });

    await t.test('E: a missing member gets a JCLR005 warning pointing at the Library panel', () => {
        const [d] = validate('//J JOB\n//S EXEC PGM=X\n//  INCLUDE MEMBER=NOPE\n').diagnostics;
        assert.deepEqual([d.code, d.severity], ['JCLR005', 'warning']);
        assert.match(d.suggestion, /Library panel/);
    });

    await t.test('I: a mistake in an included member reports the member and its own line', () => {
        const library = [{ dsn: 'MY.INCS', member: 'DDS', source: '//A DD DUMMY\n//B DD DUMMY\n//C DD DUMMY,BADKEY=1\n' }];
        const source = '//J JOB\n//LIBS JCLLIB ORDER=MY.INCS\n' + '//* filler\n'.repeat(6) + '//S EXEC PGM=X\n//  INCLUDE MEMBER=DDS\n';
        assert.deepEqual(diags(source, library), [['JCLK001', 3, 'MY.INCS(DDS)']]);
    });
});

test('catalogued procedures', async (t) => {
    await t.test('Z: with no library, unknown PROCs still get JCLR001', () => {
        assert.deepEqual(diags('//J JOB\n//S EXEC MYPROC2\n', []), [['JCLR001', 2]]);
    });

    await t.test('O/I: a PROC in the library resolves, and its mistake carries the member and line', () => {
        const library = [{ member: 'MYPROC2', source: '//MYPROC2 PROC\n//PS1 EXEC PGM=X,REGON=4M\n' }];
        assert.deepEqual(diags('//J JOB\n//S EXEC MYPROC2\n', library), [['JCLK001', 2, 'MYPROC2']]);
    });

    await t.test('O: a PROC without PROC or PEND statements still resolves', () => {
        const library = [{ member: 'BARE', source: '//PS1 EXEC PGM=X\n//DD1 DD DUMMY\n' }];
        assert.deepEqual(diags('//J JOB\n//S EXEC BARE\n//PS1.DD1 DD DSN=A.B,DISP=SHR\n', library), []);
    });

    await t.test('M: the first JCLLIB library wins', () => {
        const library = [
            { dsn: 'SECOND.PROCS', member: 'MYPROC', source: '//MYPROC PROC\n//PS EXEC PGM=X\n' },
            { dsn: 'FIRST.PROCS', member: 'MYPROC', source: '//MYPROC PROC\n//PS EXEC PGM=X,TIME=XYZ\n' }
        ];
        const source = '//J JOB\n//LIBS JCLLIB ORDER=(FIRST.PROCS,SECOND.PROCS)\n//S EXEC MYPROC\n';
        assert.deepEqual(diags(source, library), [['JCLS005', 2, 'FIRST.PROCS(MYPROC)']]);
    });

    await t.test('S: Nick\'s item 17 with the JCLLIB moved and MYPROC2 supplied has no JCLR001', () => {
        const lines = fs.readFileSync(path.join(__dirname, 'fixtures', 'nick', '17-jcllib-placement.jcl'), 'utf8').split('\n');
        const moved = [lines[0], lines[3], lines[4], lines[1], lines[2]].join('\n') + '\n';
        const library = [{ dsn: 'CAMPBEL.PROCS.JCL', member: 'MYPROC2', source: '//MYPROC2 PROC\n//STEP1 EXEC PGM=IEFBR14\n// PEND\n' }];
        assert.deepEqual(diags(moved, library), []);
    });
});
