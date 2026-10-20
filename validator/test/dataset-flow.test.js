// Dataset flow checks (Features.md feature 36).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');

const flow = jcl => validate(jcl).diagnostics.filter(d => d.code.startsWith('JCLF')).map(d => [d.code, d.severity, d.line]);
const job = (...lines) => ['//J1   JOB', ...lines].join('\n');

const EXAMPLE = [
    "//J1   JOB (A),'X'",
    '//S1   EXEC PGM=SORT',
    '//OUT  DD DSN=&&SORTED,DISP=(NEW,PASS),SPACE=(CYL,(1,1))',
    '//S2   EXEC PGM=REPORT',
    '//IN   DD DSN=&&SORTD,DISP=(OLD,DELETE)'
].join('\n');

const CREATE_READ_DELETE = job(
    '//S1 EXEC PGM=A',
    '//O DD DSN=&&T,DISP=(NEW,PASS),SPACE=(TRK,1)',
    '//S2 EXEC PGM=B',
    '//I DD DSN=&&T,DISP=(OLD,PASS)',
    '//S3 EXEC PGM=C',
    '//I DD DSN=&&T,DISP=(OLD,DELETE)'
);

test('dataset flow', async (t) => {
    await t.test('Z: no DSN gives no JCLF and no datasets', () => {
        const jcl = job('//S1 EXEC PGM=A', '//D DD DUMMY', '//P DD SYSOUT=*');
        assert.deepEqual(flow(jcl), []);
        assert.deepEqual(validate(jcl).datasets, []);
    });

    await t.test('O: a mistyped temporary name gives JCLF001 and JCLF002', () => {
        assert.deepEqual(flow(EXAMPLE), [['JCLF002', 'warning', 3], ['JCLF001', 'error', 5]]);
    });

    await t.test('I: each JCLF names the dataset and the step', () => {
        const [f002, f001] = validate(EXAMPLE).diagnostics.filter(d => d.code.startsWith('JCLF'));
        assert.match(f001.message, /'&&SORTD' is read in step S2/);
        assert.match(f001.suggestion, /'&&SORTED', which step S1 creates/);
        assert.match(f002.message, /'&&SORTED' is passed by step S1/);
        assert.equal(f001.column, 15);
    });

    await t.test('M: create, read and delete is clean, and the grid row shows N, R and D', () => {
        const result = validate(CREATE_READ_DELETE);
        assert.deepEqual(result.diagnostics, []);
        assert.equal(result.datasets.length, 1);
        assert.deepEqual(result.datasets[0].steps, ['S1', 'S2', 'S3']);
        const [row] = result.datasets[0].datasets;
        assert.equal(row.name, '&&T');
        assert.equal(row.temporary, true);
        assert.deepEqual(row.touches.map(x => [x.step, x.dd, x.line, x.actions.join('')]), [
            ['S1', 'O', 3, 'NP'], ['S2', 'I', 5, 'RP'], ['S3', 'I', 7, 'RD']
        ]);
    });

    await t.test('B: a referback to an earlier DD in the same step is accepted, a later one is not', () => {
        assert.deepEqual(flow(job(
            '//S1 EXEC PGM=A',
            '//A DD DSN=MY.DATA,DISP=SHR',
            '//B DD DSN=*.A,DISP=SHR',
            '//C DD DSN=*.D,DISP=SHR',
            '//D DD DSN=MY.OTHER,DISP=SHR'
        )), [['JCLF005', 'error', 5]]);
    });

    await t.test('B: referbacks to earlier steps and PROC steps', () => {
        const jcl = job(
            '//P PROC',
            '//PS EXEC PGM=X',
            '//OUT DD DSN=MY.OUT,DISP=SHR',
            '//PS2 EXEC PGM=Y',
            '//IN DD DSN=*.PS.OUT,DISP=SHR',
            '// PEND',
            '//S1 EXEC P',
            '//S2 EXEC PGM=Z',
            '//A DD DSN=*.S1.PS.OUT,DISP=SHR',
            '//B DD DSN=*.S1.PS.NOPE,DISP=SHR',
            '//C DD DSN=*.S9.OUT,DISP=SHR',
            '//D DD DSN=X.Y,DISP=SHR,VOL=REF=*.S3.OUT'
        );
        const found = validate(jcl).diagnostics.filter(d => d.code === 'JCLF005');
        assert.deepEqual(found.map(d => d.line), [11, 12, 13]);
        assert.match(found[0].message, /names DD NOPE, which step S1.PS doesn't have/);
        assert.match(found[1].message, /names no earlier step S9/);
        assert.equal(found[2].column, 33);
    });

    await t.test('E: DISP=MOD in the first step creates the dataset', () => {
        assert.deepEqual(flow(job('//S1 EXEC PGM=A', '//D DD DSN=&&TEMP,DISP=MOD')), []);
    });

    await t.test('E: a name with an unknown symbol is skipped', () => {
        const jcl = job('//S1 EXEC PGM=A', '//D DD DSN=&HLQ..DATA,DISP=(OLD,PASS)');
        assert.deepEqual(flow(jcl), []);
        assert.deepEqual(validate(jcl).datasets, []);
    });

    await t.test('known symbol values are filled in from SET, defaults and the EXEC', () => {
        const jcl = job(
            '//   SET T=&&WORK',
            '//P PROC N=X',
            '//PS EXEC PGM=X',
            '//O DD DSN=&&W&N,DISP=(NEW,PASS)',
            '// PEND',
            '//S1 EXEC P,N=OUT',
            '//S2 EXEC PGM=R',
            '//I DD DSN=&&WOUT,DISP=(OLD,DELETE)',
            '//W DD DSN=&T,DISP=(NEW,DELETE)'
        );
        assert.deepEqual(flow(jcl), []);
        assert.deepEqual(validate(jcl).datasets[0].datasets.map(d => d.name), ['&&WOUT', '&&WORK']);
    });

    await t.test('relative generations and quoted names are skipped', () => {
        assert.deepEqual(validate(job('//S1 EXEC PGM=A', '//D DD DSN=MY.GDG(+1),DISP=(NEW,CATLG)', "//E DD DSN='ODD',DISP=SHR")).datasets, []);
    });

    await t.test('JCLF003: catalogued twice with no delete between', () => {
        const step = n => [`//S${n} EXEC PGM=A`, '//D DD DSN=MY.NEW,DISP=(NEW,CATLG)'];
        assert.deepEqual(flow(job(...step(1), ...step(2))), [['JCLF003', 'warning', 5]]);
        assert.match(validate(job(...step(1), ...step(2))).diagnostics[0].message, /step S1 already catalogued it/);
        assert.deepEqual(flow(job(...step(1), '//S1B EXEC PGM=B', '//D DD DSN=MY.NEW,DISP=(OLD,DELETE)', ...step(2))), []);
    });

    await t.test('JCLF004: read after an earlier step deletes it', () => {
        const jcl = job('//S1 EXEC PGM=A', '//D DD DSN=MY.DATA,DISP=(OLD,DELETE)', '//S2 EXEC PGM=B', '//D DD DSN=MY.DATA,DISP=SHR');
        assert.deepEqual(flow(jcl), [['JCLF004', 'warning', 5]]);
        assert.match(validate(jcl).diagnostics[0].message, /step S1 deletes it/);
        const implicit = job('//S1 EXEC PGM=A', '//D DD DSN=&&T,DISP=NEW', '//S2 EXEC PGM=B', '//D DD DSN=&&T,DISP=OLD');
        assert.deepEqual(flow(implicit), [['JCLF004', 'warning', 5]]);
    });

    await t.test('a read in a step inside IF is a warning', () => {
        const jcl = job('//S1 EXEC PGM=A', '// IF (S1.RC = 0) THEN', '//S2 EXEC PGM=B', '//D DD DSN=&&NONE,DISP=OLD', '// ENDIF');
        assert.deepEqual(flow(jcl), [['JCLF001', 'warning', 5]]);
    });

    await t.test('a step calling a PROC that is not supplied hides the flow around it', () => {
        const jcl = job('//S1 EXEC MISSING', '//S2 EXEC PGM=B', '//D DD DSN=&&MADE,DISP=OLD');
        assert.deepEqual(flow(jcl), []);
    });

    await t.test('PROC steps are followed, with DD overrides', () => {
        const jcl = job(
            '//P PROC',
            '//PS EXEC PGM=X',
            '//O DD DSN=&&A,DISP=(NEW,PASS)',
            '// PEND',
            '//S1 EXEC P',
            '//PS.O DD DSN=&&B',
            '//S2 EXEC PGM=R',
            '//I DD DSN=&&B,DISP=(OLD,DELETE)'
        );
        const result = validate(jcl);
        assert.deepEqual(flow(jcl), []);
        assert.deepEqual(result.datasets[0].steps, ['S1.PS', 'S2']);
    });

    await t.test('a PROC nobody calls is checked on its own, once', () => {
        const jcl = job('//P PROC', '//PS EXEC PGM=X', '//I DD DSN=&&NONE,DISP=OLD', '// PEND', '//S1 EXEC PGM=A');
        assert.deepEqual(flow(jcl), [['JCLF001', 'error', 4]]);
    });

    await t.test('a PROC called twice reports a line once', () => {
        const jcl = job('//P PROC', '//PS EXEC PGM=X', '//I DD DSN=&&NONE,DISP=OLD', '// PEND', '//S1 EXEC P', '//S2 EXEC P');
        assert.deepEqual(flow(jcl), [['JCLF001', 'error', 4]]);
    });
});
