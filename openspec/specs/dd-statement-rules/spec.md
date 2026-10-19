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

### Requirement: Members and generations in dataset names
A trailing bracketed part of a DSN SHALL be read separately from the qualifiers: a generation (`0`, `+n` or `-n`), or a member of 1–8 characters starting with a letter or `$ # @` and continuing with letters, digits or `$ # @`. An invalid member SHALL get a `JCLS010` warning naming the member and the rule. The 44-character limit SHALL apply to the name without the bracketed part. A DSN without a bracketed part SHALL be checked as before.

#### Scenario: Nick's item 13
- **WHEN** `//SYSUT1 DD DSN=NICK.BECKER(MYJOB),DISP=SHR` is checked
- **THEN** no diagnostics are reported

#### Scenario: Member and generation forms
- **WHEN** `A.B(MEM)`, `A.B(+1)` and `A.B(0)` are checked
- **THEN** none gets a diagnostic

#### Scenario: Member length
- **WHEN** a member of 8 characters and one of 9 are checked
- **THEN** the first is accepted and the second gets `JCLS010` naming the member

#### Scenario: 44 characters plus a member
- **WHEN** a 44-character name with a member is checked
- **THEN** no diagnostic is reported

#### Scenario: Bad members
- **WHEN** `A.B()` and `A.B(1MEM)` are checked
- **THEN** each gets `JCLS010` without a crash

### Requirement: Temporary dataset names
A DSN starting with `&&` SHALL be a temporary name of 1–8 characters starting with a letter or `$ # @`, optionally followed by a member; otherwise `JCLS006` SHALL be reported.

#### Scenario: Temporary names
- **WHEN** `&&TEMP` and `&&TEMP(MEM)` are checked
- **THEN** neither gets a diagnostic

#### Scenario: Empty temporary name
- **WHEN** `DSN=&&` is checked
- **THEN** `JCLS006` is reported without a crash

### Requirement: Quoted dataset names
A quoted DSN SHALL skip the qualifier checks and get one `JCLS014` info note saying it isn't checked.

#### Scenario: Quoted name
- **WHEN** `DSN='ODD.NAME'` is checked
- **THEN** only a `JCLS014` info note is reported
