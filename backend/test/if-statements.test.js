// IF/THEN/ELSE conditions and branches in jobs (Features.md feature 13).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');

const diags = source => validate(source).diagnostics.map(d => [d.code, d.line, d.column]);
const firstIf = source => validate(source).ast.jobs[0].ifs[0];

test('IF statements in a job', async (t) => {
    await t.test('O: a condition on an earlier step is clean, and later steps sit in THEN', () => {
        const source = '//J JOB\n//STEP1 EXEC PGM=A\n// IF (STEP1.RC = 0) THEN\n//STEP2 EXEC PGM=B\n//STEP3 EXEC PGM=C\n// ENDIF\n';
        assert.deepEqual(diags(source), []);
        assert.deepEqual(firstIf(source).thenBranch.map(s => s.name), ['STEP2', 'STEP3']);
    });

    await t.test('M: THEN and ELSE steps land in their branches', () => {
        const source = '//J JOB\n//STEP1 EXEC PGM=A\n// IF STEP1.RC = 0 THEN\n//STEP2 EXEC PGM=B\n// ELSE\n//STEP3 EXEC PGM=C\n// ENDIF\n';
        const node = firstIf(source);
        assert.deepEqual(diags(source), []);
        assert.deepEqual([node.thenBranch.map(s => s.name), node.elseBranch.map(s => s.name)], [['STEP2'], ['STEP3']]);
    });

    await t.test('O: a condition continued on the next line is one condition', () => {
        const source = '//J JOB\n//S1 EXEC PGM=A\n//S2 EXEC PGM=B\n// IF (S1.RC = 0 &\n//     S2.RC = 0) THEN\n//S3 EXEC PGM=C\n// ENDIF\n';
        assert.deepEqual(diags(source), []);
    });

    await t.test('O: a condition continued without brackets runs until THEN', () => {
        const source = '//J JOB\n//S1 EXEC PGM=A\n// IF S1.RC = 0 |\n//    S1.RC = 4 THEN\n//S3 EXEC PGM=C\n// ENDIF\n';
        assert.deepEqual(diags(source), []);
    });

    await t.test('I: an error on a continued line points at that line and column', () => {
        const source = '//J JOB\n//S1 EXEC PGM=A\n// IF (S1.RC = 0 &\n//     S1.RC = 5000) THEN\n//S3 EXEC PGM=C\n// ENDIF\n';
        assert.deepEqual(diags(source), [['JCLC002', 4, 16]]);
    });

    await t.test('E: a missing THEN before ENDIF gets JCLC006 and ENDIF still closes the IF', () => {
        const source = '//J JOB\n//S1 EXEC PGM=A\n// IF RC = 0\n//S2 EXEC PGM=B\n// ENDIF\n';
        assert.deepEqual(diags(source).map(d => d[0]), ['JCLC006']);
    });

    await t.test('E: a second ELSE gets JCLC007', () => {
        const source = '//J JOB\n//S1 EXEC PGM=A\n// IF RC = 0 THEN\n// ELSE\n//S2 EXEC PGM=B\n// ELSE\n// ENDIF\n';
        assert.deepEqual(diags(source), [['JCLC007', 6, 4]]);
    });

    await t.test('B: 15 nested IFs pass and 16 get JCLC008', () => {
        const nest = n => '//J JOB\n//S1 EXEC PGM=A\n' + '// IF RC = 0 THEN\n'.repeat(n) + '//S2 EXEC PGM=B\n' + '// ENDIF\n'.repeat(n);
        assert.deepEqual(diags(nest(15)), []);
        assert.deepEqual(diags(nest(16)).map(d => d[0]), ['JCLC008']);
    });

    await t.test('E: a reference to a later step gets JCLC004 naming it', () => {
        const source = '//J JOB\n//S1 EXEC PGM=A\n// IF S2.RC = 0 THEN\n//S2 EXEC PGM=B\n// ENDIF\n';
        const [d] = validate(source).diagnostics;
        assert.deepEqual([d.code, d.line, d.column], ['JCLC004', 3, 7]);
        assert.match(d.message, /'S2'/);
    });

    await t.test('S: a clean-up step on failure is clean, and a typo is caught', () => {
        const job = step => `//NIGHTLY JOB (ACCT),'OPS'
//MAIN     EXEC PGM=PAYCALC
// IF (${step}.ABEND | ${step}.RC > 4) THEN
//CLEANUP  EXEC PGM=IEFBR14
// ENDIF
`;
        assert.deepEqual(diags(job('MAIN')), []);
        assert.deepEqual(diags(job('MIAN')).map(d => d[0]), ['JCLC004', 'JCLC004']);
    });

    await t.test('E: an unknown procedure step gets JCLC005', () => {
        const source = '//J JOB\n//P PROC\n//PS1 EXEC PGM=X\n//  PEND\n//RUN1 EXEC P\n// IF RUN1.PS1.RC = 0 | RUN1.NOPE.RC = 0 THEN\n//S2 EXEC PGM=B\n// ENDIF\n';
        assert.deepEqual(diags(source).map(d => d[0]), ['JCLC005']);
    });
});
