# Spec Delta

## ADDED Requirements

### Requirement: Keywords qualified with a procedure step
On an EXEC statement, `keyword.procstep=value` SHALL be checked as `keyword` against the EXEC keywords (with "Did you mean" when unknown) and its value as usual. Only `COND`, `REGION`, `TIME`, `PARM`, `ACCT`, `ADDRSPC`, `DPRTY`, `PERFORM` and `RD` MAY be qualified (`JCLK008` otherwise). The procedure step SHALL be a valid 1–8 character name (`JCLN001` otherwise). An EXEC without qualified keywords SHALL be checked as before.

#### Scenario: No qualified keywords
- **WHEN** an EXEC statement has no qualified keywords
- **THEN** its diagnostics are unchanged

#### Scenario: Nick's item 2
- **WHEN** Nick's item 2 example is checked
- **THEN** no `JCLK001` is reported for `COND.PAID`, `COND.LATE` or `COND.BILL`

#### Scenario: Eight and nine character step names
- **WHEN** `REGION.ABCDEFGH=4M` and `REGION.ABCDEFGHI=4M` are checked on a procedure call
- **THEN** the first is accepted and the second gets `JCLN001`

#### Scenario: Misspelt keyword
- **WHEN** `REGON.S1=4M` is checked
- **THEN** `JCLK001` suggests "Did you mean 'REGION'?"

#### Scenario: PGM can't be qualified
- **WHEN** `PGM.S1=X` is checked on a procedure call
- **THEN** `JCLK008` is reported

#### Scenario: Value still checked
- **WHEN** `REGION.S1=4X` is checked
- **THEN** the REGION value check reports `JCLS004`

### Requirement: Qualified keywords need a procedure
A qualified keyword on an EXEC statement with `PGM=` SHALL get a `JCLK009` error. When the called procedure is in-stream, the procedure step SHALL exist in it, or a `JCLR004` warning SHALL name the PROC and list its steps.

#### Scenario: In-stream PROC with the step
- **WHEN** `REGION.S1=4M` is on a call to an in-stream PROC with step S1
- **THEN** no diagnostics are reported

#### Scenario: Unknown step
- **WHEN** `REGION.S9=4M` is on a call to in-stream PROC MYPROC with steps S1 and S2
- **THEN** `JCLR004` says MYPROC has no step 'S9' and lists S1, S2

#### Scenario: On a PGM step
- **WHEN** `COND.S1=(4,LT)` is on `EXEC PGM=X`
- **THEN** `JCLK009` is reported

#### Scenario: Two steps overridden
- **WHEN** a job overrides REGION and COND for two steps of an in-stream PROC
- **THEN** the job checks clean
