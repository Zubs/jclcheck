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

### Requirement: IF conditions are parsed
The condition of every IF statement, from after `IF` to `THEN`, SHALL be parsed as an expression of `RC`, `ABEND`, `¬ABEND`, `ABENDCC`, `RUN` and `¬RUN` (optionally qualified by a step, or a step and procedure step), comparison operators (`GT GE LT LE EQ NE > >= < <= = ¬=`), `NOT`/`¬`, `AND`/`&`, `OR`/`|` and brackets. A job without IF statements SHALL be checked exactly as before.

#### Scenario: No IF statements
- **WHEN** a job has no IF statements
- **THEN** its diagnostics are unchanged

#### Scenario: Simple condition
- **WHEN** `// IF (STEP1.RC = 0) THEN` follows a step STEP1
- **THEN** no diagnostics are reported

#### Scenario: Combined condition
- **WHEN** `// IF (S1.RC = 0 & ¬S2.ABEND) | S3.RUN THEN` follows steps S1, S2 and S3
- **THEN** no diagnostics are reported

#### Scenario: Condition continued
- **WHEN** an IF condition is split across two lines, the second starting `//` and a blank, and ends with `THEN`
- **THEN** it is read as one condition and no diagnostics are reported

### Requirement: Condition errors
A condition that breaks the syntax SHALL get a `JCLC` error at the column of the bad part: `JCLC001` for a missing operand, unknown operator, unbalanced brackets or unexpected word; `JCLC006` when `THEN` is missing. None SHALL crash.

#### Scenario: Missing THEN
- **WHEN** `// IF RC = 0` has no `THEN`
- **THEN** `JCLC006` is reported

#### Scenario: Unknown operator
- **WHEN** `// IF RC => 4 THEN` is checked
- **THEN** `JCLC001` is reported at the column of `=>`

#### Scenario: Unbalanced brackets
- **WHEN** `// IF (RC = 0 THEN` is checked
- **THEN** `JCLC001` is reported

### Requirement: Condition values
`RC` SHALL be compared with a whole number from 0 to 4095 (`JCLC002` otherwise). `ABENDCC` SHALL take `Sxxx` with three hex digits or `Unnnn` from 0000 to 4095 (`JCLC003` otherwise).

#### Scenario: RC limits
- **WHEN** `RC = 4095` and `RC = 4096` are checked
- **THEN** the first is accepted and the second gets `JCLC002` at the value

#### Scenario: ABENDCC values
- **WHEN** `ABENDCC=S0C4`, `ABENDCC=U4095`, `ABENDCC=S0C` and `ABENDCC=U4096` are checked
- **THEN** the first two are accepted and the last two get `JCLC003`

### Requirement: Step references in conditions
A step named in a condition SHALL be an earlier step in the same job or PROC, or `JCLC004` SHALL name it. A `step.procstep` reference SHALL name a step of the in-stream PROC that step calls, or `JCLC005` SHALL name it; calls to PROCs that can't be seen are not checked.

#### Scenario: Later step
- **WHEN** a condition names a step that comes after the IF
- **THEN** `JCLC004` names that step

#### Scenario: Typo in a step name
- **WHEN** a clean-up job's condition names `MIAN` instead of `MAIN`
- **THEN** `JCLC004` names `MIAN`

#### Scenario: Clean-up step on failure
- **WHEN** `// IF (MAIN.ABEND | MAIN.RC > 4) THEN` follows step MAIN, with a clean-up step and `// ENDIF`
- **THEN** no diagnostics are reported

#### Scenario: Unknown procedure step
- **WHEN** `RUN1.NOPE.RC = 0` names a step RUN1 that calls an in-stream PROC without a step NOPE
- **THEN** `JCLC005` is reported

### Requirement: IF branches
Each IF SHALL record the steps in its THEN branch and its ELSE branch, including steps of nested IFs. An IF SHALL have at most one ELSE (`JCLC007` on the second). IFs SHALL nest at most 15 deep (`JCLC008` on the 16th).

#### Scenario: THEN branch
- **WHEN** `// IF (STEP1.RC = 0) THEN` is followed by steps STEP2 and STEP3 and `// ENDIF`
- **THEN** the IF's THEN branch holds STEP2 and STEP3

#### Scenario: THEN and ELSE
- **WHEN** an IF has STEP2 before `// ELSE` and STEP3 after it
- **THEN** STEP2 is in the THEN branch and STEP3 in the ELSE branch

#### Scenario: Second ELSE
- **WHEN** an IF has two ELSE statements
- **THEN** `JCLC007` is reported on the second

#### Scenario: Nesting limit
- **WHEN** IFs are nested 15 deep, and another set 16 deep
- **THEN** the first is accepted and the second gets `JCLC008`

### Requirement: NOTIFY statement placement
NOTIFY statements SHALL come after the JOB statement and before the job's first EXEC (`JCLO009` otherwise), and a job SHALL have at most 8 of them (`JCLO010` on the ninth).

#### Scenario: Several NOTIFY statements
- **WHEN** a job has three NOTIFY statements mixing EMAIL and USER before its first EXEC
- **THEN** no diagnostics are reported

#### Scenario: After the first EXEC
- **WHEN** a NOTIFY statement comes after the first EXEC
- **THEN** `JCLO009` is reported

#### Scenario: Too many
- **WHEN** a job has nine NOTIFY statements
- **THEN** `JCLO010` is reported on the ninth
