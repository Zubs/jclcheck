# job-structure Specification

## Purpose

Defines how a job stream is divided into jobs, which statements belong to which job, and how each job is checked on its own.

## Requirements

### Requirement: Several jobs in a stream
Each JOB statement SHALL start a new job, and every job SHALL be checked on its own: duplicate names, step references and PROC calls SHALL stay inside their own job. The result SHALL list the jobs (`ast.jobs`), with `stats.jobCount` and `stats.stepCount` totalled across jobs.

#### Scenario: One job
- **WHEN** a single job is checked
- **THEN** its diagnostics are as before and `jobCount` is 1

#### Scenario: Nick's item 4
- **WHEN** Nick's item 4 example is checked
- **THEN** there are two jobs, no diagnostics, and `jobCount` is 2

#### Scenario: Same names in two jobs
- **WHEN** two jobs each have a step `STEP1` with a DD `SYSUT1`
- **THEN** no duplicate-name diagnostics are reported

#### Scenario: Diagnostic in the second job
- **WHEN** the second job of two has an unknown keyword
- **THEN** the diagnostic points to its own line, and `stepCount` is the total of both jobs

#### Scenario: Three jobs
- **WHEN** a stream of three jobs has one mistake in each
- **THEN** each mistake is reported on its own line, and `jobCount` is 3

### Requirement: No JOB statement
Input with statements but no JOB statement SHALL get `JCLO001` once.

#### Scenario: No JOB
- **WHEN** input has only EXEC and DD statements
- **THEN** `JCLO001` is reported once

### Requirement: Null statement ends a job
The null statement (`//` alone) SHALL end the current job. A statement after it and before the next JOB statement SHALL get a `JCLO007` error.

#### Scenario: Null statement at the end
- **WHEN** `//` follows the last statement
- **THEN** no diagnostics are reported

#### Scenario: Null statement then a new job
- **WHEN** `//` is followed by a JOB statement and its steps
- **THEN** the second job starts cleanly

#### Scenario: EXEC after the null statement
- **WHEN** an EXEC statement comes after `//` and before the next JOB
- **THEN** `JCLO007` is reported on that line

### Requirement: PROCs belong to their job
An in-stream PROC SHALL belong to the job it's written in; one written before the first JOB statement SHALL belong to the first job. A step SHALL only resolve PROCs of its own job.

#### Scenario: PROC from another job
- **WHEN** a step in job 2 calls an in-stream PROC defined only in job 1
- **THEN** `JCLR001` is reported for that step

#### Scenario: PROC before the first job
- **WHEN** a PROC is defined before the first JOB statement and called from that job
- **THEN** the call resolves
