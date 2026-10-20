// Positions on continued statements (Features.md feature 33).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../src/validator');
const { tokenizeParams, valuePosition } = require('../src/paramTokenizer');

const at = d => `${d.code} L${d.line}:${d.column}`;
const check = jcl => validate(jcl).diagnostics.map(at);

test('positions on continued statements', async (t) => {
    await t.test('Z: a one-line statement keeps its line and column', () => {
        assert.deepEqual(check('//J JOB\n//S EXEC PGM=X\n//D DD DSN=A.B,DISP=SHR,SPAC=(TRK,1)\n'), ['JCLK001 L3:25']);
    });

    await t.test('O: the SPACE on line 5 is reported at 5:18', () => {
        const jcl = [
            "//J1   JOB (A),'X'",
            '//S1   EXEC PGM=IEFBR14',
            '//DD1  DD DSN=MY.FILE,',
            '//         DISP=SHR,',
            '//         SPACE=(FOO,(1,1))'
        ].join('\n');
        assert.deepEqual(check(jcl), ['JCLS002 L5:18']);
    });

    await t.test('M: a problem on each of three continuation lines', () => {
        const jcl = [
            '//J JOB',
            '//S EXEC PGM=X',
            '//D DD DSN=A.B,',
            '//         DISP=(BAD,KEEP),',
            '//         SPACE=(FOO,(1,1)),',
            '//         RECFN=FB'
        ].join('\n');
        assert.deepEqual(check(jcl), ['JCLS001 L4:17', 'JCLS002 L5:18', 'JCLK001 L6:12']);
    });

    await t.test('B: continuations starting in columns 4 and 16', () => {
        const jcl = [
            '//J JOB',
            '//S EXEC PGM=X',
            '//D DD DSN=A.B,',
            '// RECFN=FB,',
            '//             BLKSZE=0'
        ].join('\n');
        assert.deepEqual(check(jcl), ['JCLK001 L4:4', 'JCLK001 L5:16']);
    });

    await t.test('B: a value with a continued quoted string is reported where it starts', () => {
        const first = "//D DD DISP=SHR,DSN='MY.QUOTED.NAME.THAT.IS";
        const jcl = [
            '//J JOB',
            '//S EXEC PGM=X',
            first.padEnd(71, '.'),
            `//${' '.repeat(13)}END'`
        ].join('\n');
        assert.deepEqual(check(jcl), ['JCLS014 L3:21']);
    });

    await t.test('valuePosition follows a value onto its next line', () => {
        const { params } = tokenizeParams('PARM=(A,&X)', 10, [{ offset: 0, line: 1, col: 10 }, { offset: 8, line: 2, col: 16 }]);
        assert.deepEqual(valuePosition(params[0], 3), { line: 2, col: 16 });
        assert.deepEqual(valuePosition(params[0], 1), { line: 1, col: 16 });
    });

    await t.test('E: an unmatched ( on line 2 of 3 is reported at the (', () => {
        const jcl = [
            '//J JOB',
            '//S EXEC PGM=X',
            '//D DD DSN=A.B,',
            '//         DISP=(NEW,CATLG,',
            '//         UNIT=SYSDA'
        ].join('\n');
        const p003 = validate(jcl).diagnostics.filter(d => d.code === 'JCLP003').map(at);
        assert.deepEqual(p003, ['JCLP003 L4:17']);
    });

    await t.test('I: every fixture diagnostic lies within its line', () => {
        const dir = path.join(__dirname, 'fixtures');
        const files = fs.readdirSync(dir, { recursive: true }).filter(f => f.endsWith('.jcl'));
        assert.ok(files.length > 0);
        for (const file of files) {
            const lines = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r/g, '').split('\n');
            for (const d of validate(lines.join('\n')).diagnostics) {
                const line = lines[d.line - 1];
                assert.ok(line !== undefined, `${file}: ${at(d)} is past the last line`);
                assert.ok(d.column <= Math.max(line.length, 1) + 1, `${file}: ${at(d)} is past the end of a ${line.length}-character line`);
            }
        }
    });
});
