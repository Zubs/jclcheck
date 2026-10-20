// Rules settled by the answers to feature 41's questions (Features.md feature 41).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');

const diags = source => validate(source).diagnostics.map(d => [d.code, d.line, d.column]);
const GROUP = (...lines) => ['//G JOBGROUP', '//A GJOB', '//B GJOB', ...lines, '//G ENDGROUP'].join('\n');

test('NOT sign aliases', async (t) => {
    await t.test('^ and ! in an IF condition are read as NOT, with JCLC009', () => {
        const job = cond => `//J JOB\n//S1 EXEC PGM=X\n// IF (${cond}) THEN\n//S2 EXEC PGM=Y\n// ENDIF\n`;
        assert.deepEqual(diags(job('¬S1.ABEND')), []);
        assert.deepEqual(diags(job('^S1.ABEND')), [['JCLC009', 3, 8]]);
        assert.deepEqual(diags(job('S1.RC !> 4')), [['JCLC009', 3, 14]]);
        assert.equal(validate(job('^S1.ABEND')).diagnostics[0].severity, 'warning');
    });

    await t.test('a job group condition takes ! without a warning, but not ^', () => {
        assert.deepEqual(diags(GROUP('// AFTER NAME=A,WHEN=(!ABEND)')), []);
        assert.deepEqual(diags(GROUP('// AFTER NAME=A,WHEN=(^ABEND)')), [['JCLC009', 4, 23]]);
    });
});

test('job group keywords from the JCL Reference', async (t) => {
    await t.test('ACTION, OTHERWISE, FLUSHTYP, HOLD, ONERROR and TYPE have value rules', () => {
        assert.deepEqual(diags(GROUP('// AFTER NAME=A,ACTION=SATISFY,OTHERWISE=FAIL')), []);
        assert.deepEqual(diags(GROUP('// AFTER NAME=A,ACTION=NOPE')).map(d => d[0]), ['JCLS009']);
        assert.match(validate(GROUP('// BEFORE NAME=A,OTHERWISE=SKIP')).diagnostics[0].message, /SATISFY/);
        assert.deepEqual(diags('//G JOBGROUP HOLD=YES,ONERROR=SUSPEND,TYPE=SCAN\n//A GJOB FLUSHTYP=ANYFLUSH\n//G ENDGROUP\n'), []);
        assert.deepEqual(diags('//G JOBGROUP HOLD=MAYBE,ONERROR=STOP\n//A GJOB FLUSHTYP=SOME\n//G ENDGROUP\n').map(d => d[0]), ['JCLS009', 'JCLS009']);
    });

    await t.test('accounting and programmer are positional on JOBGROUP, and SJOB takes nothing', () => {
        assert.deepEqual(diags("//G JOBGROUP (ACCT),'ME',OWNER=IBMUSER\n//A GJOB\n//G ENDGROUP\n"), []);
        assert.deepEqual(diags('//G JOBGROUP ACCT=1\n//A GJOB\n//G ENDGROUP\n').map(d => d[0]), ['JCLK001']);
        assert.deepEqual(diags('//G JOBGROUP\n//S JOBSET\n//A SJOB ONERROR=STOP\n// ENDSET\n//G ENDGROUP\n').map(d => d[0]), ['JCLK001']);
    });

    await t.test('NAME= takes a list, and each name is checked', () => {
        assert.deepEqual(diags(GROUP('//C GJOB', '// AFTER NAME=(A,B)')), []);
        assert.deepEqual(diags(GROUP('//C GJOB', '// AFTER NAME=(A,Z)')).map(d => d[0]), ['JCLG008']);
    });

    await t.test('ERROR= on JOBGROUP is checked as a condition', () => {
        assert.deepEqual(diags('//G JOBGROUP ERROR=(RC>4)\n//A GJOB\n//G ENDGROUP\n'), []);
        assert.deepEqual(diags('//G JOBGROUP ERROR=(RC>>4)\n//A GJOB\n//G ENDGROUP\n').map(d => d[0]), ['JCLC001']);
    });
});

test('WHEN= over several lines', async (t) => {
    await t.test('a problem on the second line is reported there', () => {
        const jcl = [
            '//J JOB',
            "//N NOTIFY EMAIL='a@b.com',WHEN=(RC>4&",
            '//         XX=1)',
            '//S EXEC PGM=X'
        ].join('\n');
        const [d] = validate(jcl).diagnostics;
        assert.deepEqual([d.code, d.line, d.column], ['JCLC001', 3, 12]);
    });
});

test('underlines cover the whole parameter or value', async (t) => {
    const at = source => validate(source).diagnostics.map(d => [d.code, d.column, d.length]);

    await t.test('an unknown keyword covers the keyword, a bad value the whole value', () => {
        assert.deepEqual(at('//J JOB\n//S EXEC PGM=X,REGON=4M\n//D DD DSN=A.B,DISP=(BAD,KEEP)\n'), [['JCLK001', 16, 5], ['JCLS001', 21, 10]]);
    });

    await t.test('a value that runs onto the next line is covered up to the end of its first line', () => {
        const [d] = validate('//J JOB\n//S EXEC PGM=X\n//D DD DSN=A.B,DISP=(BAD,\n//         KEEP)\n').diagnostics;
        assert.deepEqual([d.code, d.line, d.column, d.length], ['JCLS001', 3, 21, 5]);
    });

    await t.test('diagnostics about a whole statement still cover one character', () => {
        assert.deepEqual(at('//J JOB\n//S EXEC PGM=X\n//D DD DISP=SHR\n'), [['JCLD002', 1, 1]]);
    });
});
