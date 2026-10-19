// Symbols in in-stream PROCs (Features.md feature 32).

const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/validator');

const diags = source => validate(source).diagnostics.map(d => [d.code, d.line, d.column]);

const EXAMPLE = `//J1   JOB (A),'X'
//     SET HLQ=PROD
//P    PROC
//S1   EXEC PGM=SORT
//W    DD DSN=&&WORK,DISP=(NEW,PASS),SPACE=(TRK,1)
//D    DD DSN=&SYSUID..DATA,DISP=SHR
//E    DD DSN=&HLQ..&ENV..DATA,DISP=SHR
//     PEND
//S    EXEC P,ENV=TEST
`;

const PROC = '//P    PROC\n//S1   EXEC PGM=SORT\n//E    DD DSN=PROD.&ENV..DATA,DISP=SHR\n//     PEND\n';

test('symbols in PROCs', async (t) => {
    await t.test('Z: a PROC with no symbols has no JCLR002', () => {
        assert.deepEqual(diags('//J JOB\n//P PROC\n//S1 EXEC PGM=X\n//  PEND\n//S EXEC P\n'), []);
    });

    await t.test('O: &&WORK is a temporary dataset, not a symbol', () => {
        assert.deepEqual(diags('//J JOB\n//P PROC\n//S1 EXEC PGM=X\n//W DD DSN=&&WORK,DISP=(NEW,PASS)\n//  PEND\n//S EXEC P\n'), []);
    });

    await t.test('M: SET, &SYSUID, &&WORK and an EXEC override are all defined', () => {
        assert.deepEqual(diags(EXAMPLE), []);
    });

    await t.test('M/I: called twice, once without ENV, gives one JCLR002 naming the second step', () => {
        const result = validate(`//J JOB\n${PROC}//S1 EXEC P,ENV=TEST\n//S2 EXEC P\n`);
        assert.deepEqual(result.diagnostics.map(d => [d.code, d.line, d.column]), [['JCLR002', 4, 20]]);
        assert.match(result.diagnostics[0].message, /when called by step 'S2'/);
    });

    await t.test('B: a SET before the call defines the symbol; one after does not', () => {
        assert.deepEqual(diags(`//J JOB\n${PROC}//     SET ENV=TEST\n//S EXEC P\n`), []);
        assert.deepEqual(diags(`//J JOB\n${PROC}//S EXEC P\n//     SET ENV=TEST\n`).map(d => d[0]), ['JCLR002']);
    });

    await t.test('E: stray ampersands don\'t crash', () => {
        assert.doesNotThrow(() => validate('//J JOB\n//P PROC\n//S1 EXEC PGM=X,PARM=&&\n//D DD DSN=A.B&,DISP=SHR\n//  PEND\n//S EXEC P\n'));
    });

    await t.test('O: a symbol with no default can be set on the EXEC', () => {
        assert.ok(!diags(`//J JOB\n${PROC}//S EXEC P,ENV=TEST\n`).some(d => d[0] === 'JCLK001'));
    });

    await t.test('I: an unknown keyword on a PROC call says so', () => {
        const d = validate(`//J JOB\n${PROC}//S EXEC P,ENV=TEST,XYZ=1\n`).diagnostics.find(x => x.code === 'JCLK001');
        assert.equal(d.message, "'XYZ' is not an EXEC keyword or a symbolic parameter of procedure 'P'.");
    });

    await t.test('S: a production PROC writing to &SYSUID.. datasets with ENV= on the EXEC is clean', () => {
        const source = `//NIGHTLY JOB (ACCT),'OPS'
//EXTRACT PROC
//STEP1   EXEC PGM=IEBGENER
//SYSUT1  DD DSN=&SYSUID..&ENV..INPUT,DISP=SHR
//SYSUT2  DD DSN=&SYSUID..&ENV..OUTPUT,DISP=(NEW,CATLG),
//           SPACE=(CYL,(1,1)),UNIT=SYSDA
//SYSPRINT DD SYSOUT=*
//SYSIN   DD DUMMY
//        PEND
//RUN     EXEC EXTRACT,ENV=PROD
`;
        assert.deepEqual(diags(source), []);
    });
});
