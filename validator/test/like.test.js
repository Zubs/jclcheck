// DSN with LIKE (Features.md feature 31).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');

const codes = dd => validate(`//J JOB\n//S EXEC PGM=X\n${dd}\n`).diagnostics.map(d => d.code);

test('LIKE', async (t) => {
    await t.test('O: DSN with LIKE is clean', () => {
        assert.deepEqual(codes('//NEW  DD  DSN=MY.NEW.FILE,LIKE=MY.MODEL.FILE,DISP=(NEW,CATLG)'), []);
    });

    await t.test('M: DSN, LIKE, DISP, UNIT and SPACE in any order are clean', () => {
        const parts = ['DSN=MY.NEW.FILE', 'LIKE=MY.MODEL', 'DISP=(NEW,CATLG)', 'UNIT=SYSDA', 'SPACE=(CYL,(1,1))'];
        for (let i = 0; i < parts.length; i++) {
            const rotated = [...parts.slice(i), ...parts.slice(0, i)];
            const dd = `//NEW DD ${rotated.slice(0, 3).join(',')},\n//         ${rotated.slice(3).join(',')}`;
            assert.deepEqual(codes(dd), [], rotated.join(','));
        }
    });

    await t.test('O: LIKE without DSN is a new temporary dataset', () => {
        assert.deepEqual(codes('//T DD LIKE=MY.MODEL,DISP=(NEW,PASS)'), []);
    });

    await t.test('I: LIKE with SYSOUT gets JCLD003 naming both', () => {
        const [d] = validate('//J JOB\n//S EXEC PGM=X\n//D DD LIKE=A.B,SYSOUT=*\n').diagnostics;
        assert.equal(d.code, 'JCLD003');
        assert.match(d.message, /'LIKE' and 'SYSOUT'/);
    });

    await t.test('E: an empty LIKE, or one with a member, gets JCLS006', () => {
        assert.deepEqual(codes('//D DD DSN=A.B,LIKE=,DISP=SHR'), ['JCLS006']);
        assert.deepEqual(codes('//D DD DSN=A.B,LIKE=A.B(MEM),DISP=SHR'), ['JCLS006']);
    });

    await t.test('Z: a DD with nothing still gets JCLD002', () => {
        assert.deepEqual(codes('//D DD DISP=SHR'), ['JCLD002']);
    });
});
