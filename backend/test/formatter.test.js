// The formatter (Features.md feature 39).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { format } = require('../src/formatter');
const { validate } = require('../src/validator');
const { createApp } = require('../src/index');
const { run } = require('../src/cli');

const BEFORE = "//STEP1 EXEC PGM=IEBGENER,REGION=0M,PARM='SOME LONG PARM',COND=(4,LT),TIME=5";
const AFTER = "//STEP1    EXEC PGM=IEBGENER,REGION=0M,PARM='SOME LONG PARM',\n//             COND=(4,LT),TIME=5";

const RAGGED = [
    '//payroll JOB (ACCT),CLASS=A',
    '//step1 exec pgm=sort,region=0m',
    '//sortin dd dsn=my.input.data,disp=shr',
    '//sortout dd dsn=my.output.data,disp=(new,catlg,delete),space=(cyl,(10,5),rlse),unit=sysda,dcb=(recfm=fb,lrecl=80)',
    '//sysin dd *',
    '  SORT FIELDS=(1,10,CH,A)',
    '/*',
    '//* a comment that stays exactly as it was written, spacing and all  ',
    '//step2 exec pgm=report,parm=\'Mixed Case Text\'',
    '//out dd path=\'/u/MixedCase/out.txt\',pathopts=(owronly,ocreat)'
].join('\n');

test('formatter', async (t) => {
    await t.test('Z: empty text stays empty', () => {
        assert.deepEqual(format(''), { text: '', changed: [], notes: [], refused: null });
    });

    await t.test('O: the example gives exactly the "after" text', () => {
        const result = format(BEFORE);
        assert.equal(result.text, AFTER);
        assert.deepEqual(result.changed, [1, 2]);
    });

    await t.test('M: formatted JCL is left alone, and formatting twice is the same as once', () => {
        assert.deepEqual(format(AFTER), { text: AFTER, changed: [], notes: [], refused: null });
        const once = format(RAGGED).text;
        assert.equal(format(once).text, once);
        assert.deepEqual(format(once).changed, []);
    });

    await t.test('B: a statement ending at column 71 stays on one line; one reaching 72 is broken at its last comma', () => {
        const head = '//S        EXEC PGM=X,PARM=';
        const fits = `${head}${'A'.repeat(71 - head.length)}`;
        assert.equal(fits.length, 71);
        assert.equal(format(fits).text, fits);
        const longer = `//S        EXEC PGM=X,REGION=0M,PARM=${'A'.repeat(71 - 37 + 1)}`;
        assert.equal(longer.length, 72);
        assert.equal(format(longer).text, `//S        EXEC PGM=X,REGION=0M,\n//             PARM=${'A'.repeat(35)}`);
    });

    await t.test('I: the result lists the changed lines', () => {
        const result = format('//J JOB\n//S        EXEC PGM=X\n//D DD DUMMY\n');
        assert.equal(result.text, '//J        JOB\n//S        EXEC PGM=X\n//D        DD DUMMY\n');
        assert.deepEqual(result.changed, [1, 3]);
    });

    await t.test('E: in-stream data, comments, quoted strings and PATH values come out as they went in', () => {
        const result = format(RAGGED);
        const lines = result.text.split('\n');
        for (const kept of ['  SORT FIELDS=(1,10,CH,A)', '/*', '//* a comment that stays exactly as it was written, spacing and all  ']) {
            assert.ok(lines.includes(kept), kept);
        }

        assert.match(result.text, /PARM='Mixed Case Text'/);
        assert.match(result.text, /PATH='\/u\/MixedCase\/out\.txt'/);
        assert.match(result.text, /^\/\/SORTOUT {2}DD DSN=my\.output\.data,/m);
        assert.ok(lines.every(l => l.length <= 71), lines.find(l => l.length > 71));
        assert.equal(result.refused, null);
    });

    await t.test('E: an unmatched parenthesis is left as it is, saying why', () => {
        const source = '//J JOB\n//S EXEC PGM=X\n//D DD DSN=A.B,\n//        DISP=(NEW,CATLG,\n//   UNIT=SYSDA\n';
        const result = format(source);
        assert.equal(result.text.split('\n').slice(2).join('\n'), source.split('\n').slice(2).join('\n'));
        assert.deepEqual(result.notes, [{ line: 3, message: 'Left as it is: it has an unmatched parenthesis.' }]);
    });

    await t.test('a long quoted value is continued in column 16, and means the same', () => {
        const source = `//J JOB\n//S EXEC PGM=X,PARM='${'B'.repeat(130)}',REGION=0M\n`;
        const result = format(source);
        const lines = result.text.split('\n');
        assert.ok(lines.every(l => l.length <= 71));
        assert.deepEqual(lines.slice(3, 5).map(l => l.indexOf('B')), [15, 15]);
        const param = text => validate(text).ast.jobs[0].steps[0].params.find(p => p.key === 'PARM').value;
        assert.equal(param(result.text), `'${'B'.repeat(130)}'`);
    });

    await t.test('sequence numbers, IF and JES statements are left alone, and a trailing comment is kept', () => {
        const numbered = '//S EXEC PGM=X                                                          00010000';
        assert.equal(format(`//J JOB\n${numbered}\n`).text, `//J        JOB\n${numbered}\n`);
        const tooLong = `//S EXEC PGM=X ${'C'.repeat(55)}`;
        assert.deepEqual(format(`//J JOB\n${tooLong}\n`).notes, [{ line: 2, message: 'Left as it is: its comment would run past column 71.' }]);
        const ifs = '//J JOB\n//S EXEC PGM=X\n// IF (S.RC = 0) THEN\n//T EXEC PGM=Y\n// ENDIF\n';
        assert.match(format(ifs).text, /^\/\/ IF \(S\.RC = 0\) THEN$/m);
        assert.match(format('/*JOBPARM  LINES=10\n//J JOB\n').text, /^\/\*JOBPARM {2}LINES=10$/m);
        assert.equal(format('//J JOB\n//S EXEC PGM=X  a short comment\n').text, '//J        JOB\n//S        EXEC PGM=X a short comment\n');
    });
});

test('format through the API and the CLI', async (t) => {
    await t.test('POST /api/format returns the text and the changed lines', async (tt) => {
        const app = createApp({ analytics: { enabled: false, record() {}, async flush() {}, stop() {} } });
        const server = await new Promise(resolve => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        tt.after(() => new Promise(resolve => server.close(resolve)));
        const post = body => fetch(`http://127.0.0.1:${server.address().port}/api/format`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const res = await post({ source: BEFORE });
        assert.deepEqual(await res.json(), { text: AFTER, changed: [1, 2], notes: [], refused: null });
        assert.equal((await post({})).status, 400);
    });

    await t.test('jclcheck format prints one file, and --write rewrites several', async (tt) => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jclcheck-format-'));
        tt.after(() => fs.rmSync(dir, { recursive: true, force: true }));
        fs.writeFileSync(path.join(dir, 'a.jcl'), BEFORE);
        fs.writeFileSync(path.join(dir, 'b.jcl'), AFTER);
        let out = '', err = '';
        const io = { cwd: dir, env: {}, stdout: s => (out += s), stderr: s => (err += s) };
        assert.equal(await run(['format', 'a.jcl'], io), 0);
        assert.equal(out, AFTER);
        assert.equal(await run(['format', 'a.jcl', 'b.jcl'], io), 2);
        assert.equal(await run(['format', '--write', 'a.jcl', 'b.jcl'], io), 0);
        assert.equal(fs.readFileSync(path.join(dir, 'a.jcl'), 'utf8'), AFTER);
        assert.match(err, /formatted a\.jcl/);
        assert.doesNotMatch(err, /formatted b\.jcl/);
    });
});
