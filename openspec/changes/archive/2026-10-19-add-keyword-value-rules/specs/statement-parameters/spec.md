# Spec Delta

## ADDED Requirements

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
