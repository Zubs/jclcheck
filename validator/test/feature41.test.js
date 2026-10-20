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

test('dataset flow: unqualified overrides and DCB referbacks', async (t) => {
    const flow = source => validate(source).diagnostics.filter(d => d.code.startsWith('JCLF')).map(d => [d.code, d.line]);

    await t.test('an override with no procedure step name applies to the first PROC step', () => {
        const jcl = [
            '//J JOB',
            '//P PROC',
            '//PS EXEC PGM=X',
            '//OUT DD DSN=&&A,DISP=(NEW,PASS)',
            '//PS2 EXEC PGM=Y',
            '// PEND',
            '//S1 EXEC P',
            '//OUT DD DSN=&&B',
            '//S2 EXEC PGM=R',
            '//I DD DSN=&&B,DISP=(OLD,DELETE)'
        ].join('\n');
        assert.deepEqual(flow(jcl), []);
        assert.deepEqual(validate(jcl).datasets[0].datasets.map(d => d.name), ['&&B']);
    });

    await t.test('DCB=*.STEP.DD is checked like a DSN referback', () => {
        const jcl = [
            '//J JOB',
            '//S1 EXEC PGM=A',
            '//OUT DD DSN=MY.OUT,DISP=SHR',
            '//S2 EXEC PGM=B',
            '//A DD DSN=MY.A,DISP=SHR,DCB=*.S1.OUT',
            '//B DD DSN=MY.B,DISP=SHR,DCB=(*.S9.OUT,LRECL=80)'
        ].join('\n');
        const found = validate(jcl).diagnostics.filter(d => d.code === 'JCLF005');
        assert.deepEqual(found.map(d => [d.line, d.column]), [[6, 31]]);
        assert.ok(!validate(jcl).diagnostics.some(d => d.code === 'JCLS003'));
    });
});

test('JCL sent to the internal reader is checked as its own job', async (t) => {
    const SUBMIT = [
        '//J JOB',
        '//S EXEC PGM=IEBGENER',
        '//SYSUT1 DD DATA,DLM=$$',
        '//INNER JOB',
        '//STEP1 EXEC REGION=4M',
        '//DD1 DD DSN=A.B,DISP=SHX',
        '$$',
        '//SYSUT2 DD SYSOUT=(A,INTRDR)',
        '//SYSPRINT DD SYSOUT=*',
        '//SYSIN DD DUMMY'
    ].join('\n');

    await t.test('its problems are on the lines where it is written', () => {
        const found = validate(SUBMIT).diagnostics.map(d => [d.code, d.line]);
        assert.deepEqual(found, [['JCLD004', 3], ['JCLK002', 5], ['JCLS001', 6]]);
        assert.equal(validate(SUBMIT).stats.errors, 2);
    });

    await t.test('a suppression inside it applies to it alone', () => {
        const jcl = SUBMIT.replace('//STEP1 EXEC REGION=4M', '//* JCLCHECK OFF-NEXT JCLK002\n//STEP1 EXEC REGION=4M');
        const found = validate(jcl).diagnostics;
        assert.deepEqual(found.filter(d => !d.suppressed).map(d => [d.code, d.line]), [['JCLD004', 3], ['JCLS001', 7]]);
        assert.deepEqual(found.filter(d => d.suppressed).map(d => [d.code, d.line]), [['JCLK002', 6]]);
    });

    await t.test('a reader job that sends another is checked too, to a limit', () => {
        const nest = depth => (depth === 0 ? '//LAST JOB\n//S EXEC REGION=1M' : [
            `//J${depth} JOB`,
            '//S EXEC PGM=IEBGENER',
            `//SYSUT1 DD DATA,DLM=${String.fromCharCode(64 + depth).repeat(2)}`,
            nest(depth - 1),
            String.fromCharCode(64 + depth).repeat(2),
            '//SYSUT2 DD SYSOUT=(A,INTRDR)'
        ].join('\n'));
        const codes = validate(nest(2)).diagnostics.map(d => d.code);
        assert.deepEqual(codes.filter(c => c === 'JCLK002'), ['JCLK002']);
        assert.doesNotThrow(() => validate(nest(8)));
    });
});

test('level marks from the JCL Reference', async (t) => {
    const codes = (source, zosLevel) => validate(source, { zosLevel }).diagnostics.map(d => d.code);

    await t.test('ABDISPCC on EXEC exists from z/OS 2.5', () => {
        const jcl = '//J JOB\n//S EXEC PGM=X,ABDISPCC=4\n';
        assert.deepEqual(codes(jcl, '2.4'), ['JCLK005']);
        assert.deepEqual(codes(jcl, '2.5'), []);
    });

    await t.test('EMAIL on JOBGROUP exists from z/OS 2.4', () => {
        const jcl = "//G JOBGROUP EMAIL='a@b.com'\n//A GJOB\n//G ENDGROUP\n";
        assert.deepEqual(codes(jcl, '2.3'), ['JCLK005']);
        assert.deepEqual(codes(jcl, '2.4'), []);
    });

    await t.test('REGIONX is a JOB and EXEC keyword at every supported level', () => {
        assert.deepEqual(codes('//J JOB REGIONX=(0M,2G)\n//S EXEC PGM=X,REGIONX=(0M,1G)\n', '2.3'), []);
    });
});
