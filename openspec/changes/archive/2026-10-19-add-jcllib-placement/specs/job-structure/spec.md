# Spec Delta

## ADDED Requirements

### Requirement: JCLLIB placement
A JCLLIB statement SHALL come after the JOB statement and before the job's first EXEC statement, or a `JCLO005` error SHALL be reported at its operation column, with a fix saying where to move it. A job SHALL have at most one JCLLIB; a later one SHALL get `JCLO006`. A JCLLIB inside an in-stream PROC SHALL get `JCLO008`.

#### Scenario: No JCLLIB
- **WHEN** a job has no JCLLIB statement
- **THEN** no JCLLIB diagnostics are reported

#### Scenario: Between JOB and the first EXEC
- **WHEN** a JCLLIB directly follows the JOB statement and precedes the first EXEC
- **THEN** no diagnostics are reported

#### Scenario: Nick's item 17
- **WHEN** Nick's item 17 example is checked
- **THEN** `JCLO005` is reported on line 4 at column 12, alongside the `JCLR001` warning for the unseen PROC

#### Scenario: Directly after the first EXEC
- **WHEN** a JCLLIB comes directly after the first EXEC statement
- **THEN** `JCLO005` is reported, and its suggestion says to move it between the JOB statement and the first EXEC

#### Scenario: Moved as suggested
- **WHEN** the JCLLIB in Nick's item 17 is moved above the first EXEC
- **THEN** `JCLO005` is no longer reported

#### Scenario: Two JCLLIBs
- **WHEN** a job has two JCLLIB statements before its first EXEC
- **THEN** `JCLO006` is reported on the second

#### Scenario: Inside a PROC
- **WHEN** a JCLLIB appears between an in-stream PROC and its PEND
- **THEN** `JCLO008` is reported

### Requirement: JCLLIB contents
JCLLIB SHALL require `ORDER=` (`JCLK002` when missing) and SHALL accept no other keyword (`JCLK001`). Each library in `ORDER=` SHALL be checked with the dataset name rules.

#### Scenario: No ORDER
- **WHEN** `//LIBS JCLLIB` has no operand
- **THEN** `JCLK002` names `ORDER`

#### Scenario: Library name too long
- **WHEN** a library in `ORDER=` is longer than 44 characters
- **THEN** `JCLS006` is reported

### Requirement: Unresolved PROC names the JCLLIB libraries
When a job has a JCLLIB, the `JCLR001` message for a PROC that isn't defined in-stream SHALL name the first library and how many others there are. It SHALL stay a warning.

#### Scenario: PROC with a JCLLIB
- **WHEN** a job with `JCLLIB ORDER=(A.PROCS,B.PROCS,C.PROCS)` calls a PROC that isn't in-stream
- **THEN** the `JCLR001` warning says the PROC may be found in A.PROCS or 2 other libraries
