// Member names and other dataset name forms (Features.md feature 19).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');

// NEW, so a temporary name is created here rather than read (feature 36).
const dd = dsn => `//J JOB\n//S EXEC PGM=X\n//D DD DSN=${dsn},\n//         DISP=(NEW,DELETE)\n`;
const diags = dsn => validate(dd(dsn)).diagnostics.map(d => [d.code, d.severity]);

test('dataset name forms', async (t) => {
    await t.test('Z: a plain name is checked as before', () => {
        assert.deepEqual(diags('PROD.PAYROLL'), []);
        assert.deepEqual(diags('PROD.WAYTOOLONGQ').map(d => d[0]), ['JCLS007']);
    });

    await t.test('O: Nick\'s item 13 is clean', () => {
        assert.deepEqual(validate('//NICK     JOB\n//STEP1    EXEC PGM=IEFBR14\n//SYSUT1 DD DSN=NICK.BECKER(MYJOB),DISP=SHR\n').diagnostics, []);
    });

    for (const dsn of ['A.B(MEM)', 'A.B(+1)', 'A.B(-2)', 'A.B(0)', '&&TEMP', '&&TEMP(MEM)', 'MY.LIB(ABCDEFGH)', '&LIB..X(&MEM)']) {
        await t.test(`M: ${dsn} is accepted`, () => {
            assert.deepEqual(diags(dsn), []);
        });
    }

    await t.test('B/I: a 9-character member gets JCLS010 naming it', () => {
        const [d] = validate(dd('MY.LIB(ABCDEFGHI)')).diagnostics;
        assert.equal(d.code, 'JCLS010');
        assert.match(d.message, /'ABCDEFGHI'/);
        assert.match(d.suggestion, /1-8 letters/);
    });

    await t.test('B: 44 characters plus a member are accepted', () => {
        const name = 'A2345678.B2345678.C2345678.D2345678.E2345678';
        assert.equal(name.length, 44);
        assert.deepEqual(diags(`${name}(MEM)`), []);
    });

    for (const dsn of ['A.B()', 'A.B(1MEM)']) {
        await t.test(`E: ${dsn} gets JCLS010`, () => {
            assert.deepEqual(diags(dsn), [['JCLS010', 'warning']]);
        });
    }

    await t.test('E: A.B(MEM with no closing bracket gets a diagnostic without a crash', () => {
        assert.ok(validate(dd('A.B(MEM')).diagnostics.length > 0);
    });

    await t.test('E: && alone gets JCLS006', () => {
        assert.deepEqual(diags('&&'), [['JCLS006', 'error']]);
    });

    await t.test('O: a quoted name only gets an info note', () => {
        assert.deepEqual(diags("'ODD.NAME'"), [['JCLS014', 'info']]);
    });
});
