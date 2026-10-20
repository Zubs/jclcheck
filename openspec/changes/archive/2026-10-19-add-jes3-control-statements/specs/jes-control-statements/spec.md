# Spec Delta

## ADDED Requirements

### Requirement: JES choice
Validation SHALL accept a `jes` option of `JES2` or `JES3`, defaulting to `JES2`, and the result SHALL include the `jes` used. JES3 SHALL be allowed only at z/OS 2.5 or earlier. Through the API, `jes: "JES3"` at 3.1 or later, or any other `jes` value, SHALL get a 400 response with a message saying why, and nothing SHALL be validated.

#### Scenario: Default JES
- **WHEN** a request has no `jes`
- **THEN** the response's `jes` is `"JES2"`

#### Scenario: JES3 at z/OS 2.5
- **WHEN** a request has `"jes": "JES3"` and `"zosLevel": "2.5"`
- **THEN** the JCL is checked for JES3 and the response's `jes` is `"JES3"`

#### Scenario: JES3 at z/OS 3.1
- **WHEN** a request has `"jes": "JES3"` and `"zosLevel": "3.1"`, or no level (3.2)
- **THEN** the response is 400 and its message says JES3 was removed in z/OS 3.1

#### Scenario: Unknown JES
- **WHEN** a request has `"jes": "JES4"`
- **THEN** the response is 400 and its message lists JES2 and JES3

### Requirement: JES3 statements recognised
With JES3, a line starting `//*` followed immediately by a known JES3 statement name and then a blank or the end of the line SHALL be a JES3 statement. Other `//*` lines SHALL stay comments. Lines starting `//**` SHALL be JES3 command statements. Lines between `//*DATASET` and `//*ENDDATASET` SHALL be data.

#### Scenario: MAIN after JOB
- **WHEN** `//*MAIN CLASS=A` follows the JOB statement in a JES3 check at z/OS 2.5
- **THEN** no diagnostics are reported

#### Scenario: Several valid statements
- **WHEN** a JES3 job has valid `//*MAIN CLASS=A`, `//*FORMAT PR,DDNAME=SYSPRINT,COPIES=2` and `//*NETACCT PNAME=SMITH` statements after the JOB statement
- **THEN** no diagnostics are reported

#### Scenario: Comments that look similar
- **WHEN** `//*MAINFRAME NOTES` and `//* MAIN` appear in a JES3 check
- **THEN** both stay comments and get no diagnostics

#### Scenario: Data between DATASET and ENDDATASET
- **WHEN** `//*DATASET DDNAME=INPUT` is followed by two data lines and `//*ENDDATASET`
- **THEN** the data lines get no `JCLL001`

#### Scenario: JES3 production job on z/OS 2.4
- **WHEN** a valid job with `//*MAIN` and `//*FORMAT` cards is checked for JES3 at z/OS 2.4
- **THEN** no diagnostics are reported

### Requirement: JES3 statement checks
With JES3: a `//*` word within two edits of a JES3 statement name, followed by an operand containing `=`, SHALL get `JCLJ301` with "Did you mean". An unknown keyword on `MAIN`, `FORMAT`, `NET`, `NETACCT` or `DATASET` SHALL get `JCLJ302` with "Did you mean" when close. A `//*DATASET` without a later `//*ENDDATASET` SHALL get `JCLJ304`. These SHALL be warnings.

#### Scenario: Misspelt MAIN
- **WHEN** `//*MIAN CLASS=A` is checked for JES3
- **THEN** `JCLJ301` is reported with "Did you mean 'MAIN'?"

#### Scenario: Unknown keyword on MAIN
- **WHEN** `//*MAIN CLAS=A` is checked for JES3
- **THEN** `JCLJ302` is reported at the keyword with "Did you mean 'CLASS'?"

#### Scenario: DATASET not closed
- **WHEN** `//*DATASET DDNAME=X` has no `//*ENDDATASET` before the end of the file
- **THEN** `JCLJ304` is reported on the DATASET line, without a crash

### Requirement: JES3 statement placement
With JES3, every JES3 statement except `PAUSE` SHALL come after the JOB statement, and `PAUSE` SHALL come before it. `MAIN`, `NET`, `NETACCT`, `PROCESS` and `ENDPROCESS` SHALL also come before the first EXEC statement. A statement in the wrong place SHALL get a `JCLJ303` warning.

#### Scenario: MAIN after the first EXEC
- **WHEN** `//*MAIN CLASS=A` comes after the first EXEC statement in a JES3 check
- **THEN** `JCLJ303` is reported on that line

### Requirement: Statements for the other JES
With JES3, a JES2 statement other than `/*SIGNON` and `/*SIGNOFF` SHALL get a `JCLJ305` warning saying it's a JES2 statement, and no JES2 checks. With JES2, a `//*` line that would be a JES3 statement SHALL stay a comment and get one `JCLJ306` info note saying it looks like a JES3 statement.

#### Scenario: ROUTE in a JES3 check
- **WHEN** `/*ROUTE PRINT NODE1` appears in a JES3 check
- **THEN** `JCLJ305` is reported on that line

#### Scenario: MAIN in a JES2 check
- **WHEN** a JES2 check (the default) has `//*MAIN CLASS=A`
- **THEN** the job is checked exactly as before plus one `JCLJ306` info note on that line
