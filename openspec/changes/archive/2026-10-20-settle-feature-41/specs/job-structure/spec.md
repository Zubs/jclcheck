# Spec Delta

## MODIFIED Requirements

### Requirement: NOTIFY statement placement
NOTIFY statements SHALL be allowed anywhere after the job's JOB statement; one before any JOB statement SHALL get `JCLO009`, and a job SHALL have at most 8 of them (`JCLO010` on the ninth).

#### Scenario: Several NOTIFY statements
- **WHEN** a job has three NOTIFY statements mixing EMAIL and USER before its first EXEC
- **THEN** no diagnostics are reported

#### Scenario: After the first EXEC
- **WHEN** a NOTIFY statement comes after the first EXEC
- **THEN** no placement diagnostic is reported

#### Scenario: Too many
- **WHEN** a job has nine NOTIFY statements
- **THEN** `JCLO010` is reported on the ninth

## ADDED Requirements

### Requirement: PROC before the JOB statement
An in-stream PROC before the first JOB statement of a stream SHALL be an error.

#### Scenario: PROC first
- **WHEN** a stream starts with a PROC ... PEND and then a JOB statement
- **THEN** an error is reported at the PROC statement

### Requirement: Internal reader JCL checked
In-stream data sent to the internal reader SHALL be checked as its own job stream, with its diagnostics on the lines where that JCL is written.

#### Scenario: Error inside
- **WHEN** the in-stream data of a `SYSOUT=(A,INTRDR)` DD has a JOB with an EXEC missing PGM
- **THEN** `JCLK002` is reported on that EXEC's line
