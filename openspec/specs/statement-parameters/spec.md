# statement-parameters Specification

## Purpose

Rules for the parameters written on JCL statements: how many positional parameters each statement takes, which keywords it accepts, and what values they may hold.

## Requirements

### Requirement: Positional parameter limits
A JOB statement SHALL allow at most 2 positional parameters, an EXEC statement 1 and a DD statement 1. Empty positionals (`,,`) before the first keyword SHALL count. Exceeding the limit SHALL give one `JCLK004` error at the first positional over it, naming the statement, the limit and the number found.

#### Scenario: No parameters
- **WHEN** `//J JOB` is checked
- **THEN** no diagnostics are reported

#### Scenario: Accounting or name alone
- **WHEN** `//J JOB (ACCT)` or `//J JOB ,'NAME'` is checked
- **THEN** no diagnostics are reported

#### Scenario: Nick's item 16
- **WHEN** `//CLEAN JOB ,,,,,,,,,,,,,,,MSGLEVEL=(1,1)` is checked
- **THEN** exactly one `JCLK004` is reported, at column 15, and its message says the JOB statement allows at most 2 and 15 were found

#### Scenario: Two and three positionals
- **WHEN** a JOB statement has two positional parameters, and another has three
- **THEN** the first is accepted and the second gets `JCLK004`

#### Scenario: DD with two positionals
- **WHEN** `//IN DD *,DUMMY` is checked
- **THEN** `JCLK004` is reported

#### Scenario: Typical JOB statement
- **WHEN** `//PAYROLL JOB (ACCT),'J SMITH',CLASS=A` is checked
- **THEN** no diagnostics are reported

### Requirement: JOB positional sizes
Accounting information over 143 characters, or a programmer's name over 20 characters (not counting enclosing quotes, with `''` counting as one), SHALL get a `JCLS012` warning.

#### Scenario: Name of 20 and 21 characters
- **WHEN** the programmer's name is 20 characters, and another is 21
- **THEN** the first is accepted and the second gets `JCLS012`

### Requirement: Programmer's name quoting
A programmer's name containing characters other than letters, digits, `$ # @`, periods and hyphens SHALL be enclosed in quotes, or a `JCLS013` warning SHALL say to quote it.

#### Scenario: Unquoted special characters
- **WHEN** `//J JOB ACCT,J/SMITH` is checked
- **THEN** `JCLS013` is reported at the name

#### Scenario: Plain name
- **WHEN** `//J JOB ACCT,J.SMITH` is checked
- **THEN** no diagnostics are reported

### Requirement: Positional after a keyword
A positional parameter after a keyword parameter SHALL still get `JCLK003`.

#### Scenario: Positional after keyword
- **WHEN** `//J JOB CLASS=A,(ACCT)` is checked
- **THEN** `JCLK003` is reported at `(ACCT)`

### Requirement: Keyword values follow their rule
A keyword with a value rule SHALL have its value checked against that rule, and a value that breaks it SHALL get one `JCLS009` warning at the value's column, whose message names the keyword, says what is allowed and shows the value found. A keyword without a rule SHALL accept any value.

#### Scenario: No rule
- **WHEN** a keyword without a value rule (`USER=ANYTHING`) is checked
- **THEN** no value diagnostic is reported

#### Scenario: Enum value and a near miss
- **WHEN** `TYPRUN=SCAN` and `TYPRUN=SCAM` are checked
- **THEN** the first is accepted and the second gets `JCLS009` with "Did you mean 'SCAN'?"

#### Scenario: Five bad values
- **WHEN** a JOB statement has `CLASS=AB,MSGCLASS=%,TYPRUN=NOW,PRTY=99,ADDRSPC=BIG`
- **THEN** five `JCLS009` warnings are reported, each at its own value

#### Scenario: Integer limits
- **WHEN** `PRTY=0`, `PRTY=15`, `PRTY=-1` and `PRTY=16` are checked
- **THEN** the first two are accepted and the last two get `JCLS009`

#### Scenario: One character
- **WHEN** `CLASS=A` and `CLASS=AB` are checked
- **THEN** the first is accepted and the second gets `JCLS009`, at the value's column, listing what's allowed

#### Scenario: Empty value
- **WHEN** `CLASS=` is checked
- **THEN** `JCLS009` is reported without a crash

### Requirement: Symbolic values skipped
A value containing a symbolic parameter (`&`) or starting with a referback (`*.`) SHALL NOT be checked against its rule.

#### Scenario: Symbolic CLASS in a PROC
- **WHEN** `CLASS=&MYCLASS` appears on a step inside an in-stream PROC
- **THEN** no `JCLS009` is reported for it

### Requirement: Existing value checks unchanged
DISP, SPACE, DCB, REGION, TIME, DSN, RECFM and DSORG SHALL keep their existing checks and codes.

#### Scenario: Existing fixtures
- **WHEN** the existing fixtures and workbench samples are checked
- **THEN** their diagnostics are unchanged

### Requirement: JES3 keyword values
With JES3, `HOLD` on `//*MAIN` SHALL be `YES` or `NO`, and `FAILURE` SHALL be `RESTART`, `CANCEL`, `HOLD` or `PRINT`; other values SHALL get `JCLS009`.

#### Scenario: Bad HOLD
- **WHEN** `//*MAIN HOLD=MAYBE` is checked for JES3
- **THEN** `JCLS009` is reported at `MAYBE`

### Requirement: MSGLEVEL values
`MSGLEVEL` SHALL take at most two sub-parameters: statements (0, 1 or 2) and messages (0 or 1). Either MAY be omitted, but not both. Any other form SHALL get one `JCLS009` warning at the value, saying which sub-parameter is wrong.

#### Scenario: No MSGLEVEL
- **WHEN** a JOB statement has no MSGLEVEL
- **THEN** no MSGLEVEL diagnostic is reported

#### Scenario: Valid forms
- **WHEN** `MSGLEVEL=(1,1)`, `MSGLEVEL=1`, `MSGLEVEL=(2)`, `MSGLEVEL=(,0)`, `MSGLEVEL=(0,1)` and `MSGLEVEL=(2,1)` are checked
- **THEN** none gets a diagnostic

#### Scenario: Out of range
- **WHEN** `MSGLEVEL=(3,1)` and `MSGLEVEL=(2,2)` are checked
- **THEN** each gets `JCLS009`, and the second says "messages must be 0 or 1; found '2'"

#### Scenario: Too many sub-parameters
- **WHEN** `MSGLEVEL=(1,1,1)` is checked
- **THEN** `JCLS009` is reported

#### Scenario: Malformed values
- **WHEN** `MSGLEVEL=()`, `MSGLEVEL=(A,B)` and `MSGLEVEL=(1,1` are checked
- **THEN** each gets a clear diagnostic and none crashes

#### Scenario: Nick's item 6
- **WHEN** `MSGLEVEL=(1,1,1,5)` is checked
- **THEN** one `JCLS009` explains the two allowed sub-parameters, and `MSGLEVEL=(1,1)` checks clean

### Requirement: NOTIFY on the JOB statement
`NOTIFY=` on the JOB statement SHALL be `&SYSUID`, a TSO user ID of 1–8 characters that starts with a letter or `$ # @` and continues with letters, digits or `$ # @` (either case), or `node.userid` with a node of the same form. Any other value, including an empty one or one mixing text with `&SYSUID`, SHALL get a `JCLS009` warning at the value that gives the length and character rules.

#### Scenario: No NOTIFY
- **WHEN** a JOB statement has no NOTIFY
- **THEN** no NOTIFY diagnostic is reported

#### Scenario: SYSUID and a user ID
- **WHEN** `NOTIFY=&SYSUID` and `NOTIFY=IBMUSER` are checked
- **THEN** neither gets a diagnostic

#### Scenario: Eight and nine characters
- **WHEN** `NOTIFY=ABCDEFGH` and `NOTIFY=ABCDEFGHI` are checked
- **THEN** the first is accepted and the second gets `JCLS009` naming the 1-8 character rule

#### Scenario: Nick's item 7
- **WHEN** `NOTIFY=IBMUSERRRRRRRR`, `NOTIFY=laskdjasd1.&SYSUID` and `NOTIFY=N1.IBMUSER` are checked
- **THEN** the first two get `JCLS009` at column 19, and the third is accepted until feature 41 decides on `node.userid`

#### Scenario: Bad first character and empty value
- **WHEN** `NOTIFY=1BMUSER` and `NOTIFY=` are checked
- **THEN** both get `JCLS009` without a crash

### Requirement: NOTIFY statement keywords
The NOTIFY statement SHALL accept `EMAIL`, `USER`, `TYPE` and `WHEN` only. `EMAIL` SHALL be a quoted address of up to 246 characters with exactly one `@`; `USER` SHALL follow the NOTIFY user ID rule; `TYPE` SHALL be `MSG` or `EMAIL`; `WHEN` SHALL be a condition in brackets or quotes. A value breaking its rule SHALL get `JCLS009`.

#### Scenario: USER only
- **WHEN** `//N1 NOTIFY USER=IBMUSER` follows the JOB statement
- **THEN** no diagnostics are reported

#### Scenario: Nick's item 12
- **WHEN** `//N1   NOTIFY USER=IBMUSER,TYPE=EMAILaasdasd` is checked
- **THEN** `JCLS009` is reported at column 33, listing MSG and EMAIL

#### Scenario: EMAIL length
- **WHEN** an EMAIL address of 246 characters and one of 247 are checked
- **THEN** the first is accepted and the second gets `JCLS009`

#### Scenario: EMAIL without @ or quotes
- **WHEN** `EMAIL='nick'` and an unquoted address are checked
- **THEN** both get `JCLS009` saying the address must be quoted with one @

#### Scenario: EMAIL on the JOB statement
- **WHEN** `EMAIL='nick'` is used on the JOB statement
- **THEN** `JCLS009` is reported

#### Scenario: WHEN condition
- **WHEN** `WHEN=(RC>4)` and `WHEN=(RC => 4)` are checked
- **THEN** the first is accepted and the second gets a `JCLC001`

### Requirement: EMAIL or USER on NOTIFY
A NOTIFY statement SHALL have `EMAIL` or `USER`: with neither, `JCLK002` SHALL ask for one; with both, `JCLK007` SHALL report the conflict.

#### Scenario: No parameters
- **WHEN** `//N1 NOTIFY` has no parameters
- **THEN** `JCLK002` asks for EMAIL or USER

#### Scenario: Both
- **WHEN** a NOTIFY statement has both EMAIL and USER
- **THEN** `JCLK007` is reported

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
