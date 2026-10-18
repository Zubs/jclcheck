# dd-statement-rules Specification

## Purpose

Rules the validator applies to DD statements: where their data comes from, what in-stream data holds, which names and keywords they may use, and when to explain something it can't check.

## Requirements

### Requirement: JCL carried in DD DATA
Lines inside `DD DATA` data, including lines starting with `//`, SHALL be kept as data and SHALL NOT be checked as JCL. Under `DD *` without `DLM=`, a `//` line SHALL still end the data.

#### Scenario: Empty DD DATA
- **WHEN** `DD DATA` is followed directly by `/*`
- **THEN** no diagnostics are reported

#### Scenario: One JCL line
- **WHEN** `DD DATA` data holds one `//` line and ends at `/*`
- **THEN** the `//` line is data, not a statement

#### Scenario: Nick's item 14
- **WHEN** Nick's item 14 example is checked
- **THEN** there is no `JCLO004` and no `JCLL001`, no errors, and the step has two DDs (`SYSUT1` holding the nested JOB and EXEC lines, and `SYSUT2`)

#### Scenario: Same lines under DD star
- **WHEN** the same nested lines follow `DD *`
- **THEN** the data ends at the first `//` line, as before

#### Scenario: Missing delimiter
- **WHEN** `DD DATA` with a nested job has no `/*` before the end of the file
- **THEN** the missing-delimiter warning `JCLL006` is reported and the nested JCL is not checked

### Requirement: Internal reader note
When a DD's in-stream data (`DD DATA`, or `DD *` with `DLM=`) contains a JOB statement and the same step has a DD with `SYSOUT=(class,INTRDR)`, one `JCLD004` info diagnostic SHALL be reported on that DD's line, saying the in-stream JCL will be submitted as a separate job and isn't checked here. It SHALL NOT be reported otherwise.

#### Scenario: Job sent to the internal reader
- **WHEN** a step has `DD DATA` holding `//NESTED JOB` and a DD with `SYSOUT=(*,INTRDR)`
- **THEN** one `JCLD004` info is reported on the `DD DATA` line

#### Scenario: No internal reader
- **WHEN** a step has `DD DATA` holding a JOB statement but no `INTRDR` DD
- **THEN** no `JCLD004` is reported

#### Scenario: No JOB statement in the data
- **WHEN** a step has `DD DATA` holding only an EXEC line, and an `INTRDR` DD
- **THEN** no `JCLD004` is reported

#### Scenario: IEBGENER submit job
- **WHEN** an IEBGENER job copies `DD DATA` holding a complete job to `SYSOUT=(A,INTRDR)`, with `SYSPRINT` and `SYSIN DD DUMMY`
- **THEN** the outer job has no errors or warnings
