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
