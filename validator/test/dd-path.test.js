// DD data sources, including PATH (Features.md feature 21).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');

const STEP = '//J JOB\n//S EXEC PGM=BPXBATCH\n';
const codes = dds => validate(STEP + dds).diagnostics.map(d => d.code);

test('z/OS UNIX file keywords', async (t) => {
    await t.test('O: Nick\'s item 19 is clean', () => {
        assert.deepEqual(codes("//DD1  DD  PATH='/usr/applics/pay.time',PATHOPTS=ORDONLY\n"), []);
    });

    await t.test('M: all the path keywords together are clean', () => {
        const dd = "//OUT DD PATH='/u/me/out.txt',PATHOPTS=(OWRONLY,OCREAT,OTRUNC),\n" +
            '//          PATHMODE=(SIRUSR,SIWUSR),PATHDISP=(KEEP,DELETE),\n' +
            '//          FILEDATA=TEXT\n';
        assert.deepEqual(codes(dd), []);
    });

    await t.test('B: 255-character paths pass; 256 and relative paths fail', () => {
        const long = n => '/' + 'a'.repeat(n - 1);
        // Long paths need continuation lines, so check the rule directly.
        const { checkValue, path } = require('../src/valueRules');
        assert.equal(checkValue(path(255), `'${long(255)}'`), null);
        assert.ok(checkValue(path(255), `'${long(256)}'`));
        assert.deepEqual(codes('//D DD PATH=pay.time\n'), ['JCLS009']);
    });

    await t.test('S: a BPXBATCH step with STDOUT and STDERR in UNIX files is clean', () => {
        const dds = "//STDOUT DD PATH='/tmp/job.out',PATHOPTS=(OWRONLY,OCREAT),\n" +
            '//          PATHMODE=SIRWXU\n' +
            "//STDERR DD PATH='/tmp/job.err',PATHOPTS=(OWRONLY,OCREAT),\n" +
            '//          PATHMODE=SIRWXU\n';
        assert.deepEqual(codes(dds), []);
    });
});

test('path conflicts and data sources', async (t) => {
    await t.test('I: PATH with DSN gets JCLD003 naming both', () => {
        const [d] = validate(STEP + "//D DD DSN=A.B,PATH='/x'\n").diagnostics;
        assert.equal(d.code, 'JCLD003');
        assert.match(d.message, /'DSN' and 'PATH'/);
    });

    await t.test('E: two access modes get JCLD005', () => {
        assert.deepEqual(codes("//D DD PATH='/x',PATHOPTS=(ORDONLY,OWRONLY)\n"), ['JCLD005']);
    });

    await t.test('E: PATHOPTS without PATH gets JCLD007', () => {
        assert.deepEqual(codes('//D DD DSN=A.B,DISP=SHR,PATHOPTS=ORDONLY\n'), ['JCLD007']);
    });

    await t.test('E: DISP with PATH gets JCLD006', () => {
        const [d] = validate(STEP + "//D DD PATH='/x',DISP=SHR\n").diagnostics;
        assert.equal(d.code, 'JCLD006');
        assert.match(d.suggestion, /PATHDISP/);
    });

    for (const dd of ['//T DD UNIT=SYSDA,SPACE=(TRK,1)', '//T DD SUBSYS=(BLSR,DDNAME=X)', '//T DD DDNAME=SYSIN']) {
        await t.test(`E: ${dd} has a data source`, () => {
            assert.ok(!codes(dd + '\n').includes('JCLD002'));
        });
    }

    await t.test('Z: a DD with no source and no SPACE still gets JCLD002', () => {
        assert.deepEqual(codes('//T DD DISP=SHR\n'), ['JCLD002']);
    });
});
