# diagnostic-severities Specification

## Purpose

Each diagnostic code has a deliberate default severity, so a job z/OS would reject is never shown as clean.

## Requirements

### Requirement: Per-code default severity
Every code in the `CATALOG` SHALL declare its default severity (`error`, `warning` or `info`). A diagnostic SHALL use that severity unless its call site sets one; the code's prefix SHALL only be a fallback. A test SHALL list every code's severity so that any change is deliberate.

#### Scenario: Listed severities
- **WHEN** the catalog's severities are compared with the test's list
- **THEN** they are identical

#### Scenario: No diagnostics
- **WHEN** JCL has no diagnostics
- **THEN** it is `valid: true`

### Requirement: Real JCL errors are errors
`JCLK002`, `JCLK003`, `JCLS001`, `JCLS006`, `JCLS007` and `JCLS008` SHALL be errors. `JCLK001` and the other value checks SHALL stay warnings.

#### Scenario: EXEC with no program
- **WHEN** a job's EXEC has `REGION=4M` and no PGM or PROC
- **THEN** `JCLK002` is an error and the job is `valid: false`

#### Scenario: One of each
- **WHEN** a job has one example of each listed code
- **THEN** each is an error and `stats.errors` counts them all

#### Scenario: Dataset name length
- **WHEN** a dataset name is 44 characters, and another 45
- **THEN** the first is accepted and the second is an error

#### Scenario: Symbolic DISP
- **WHEN** `DISP=&D` is inside a PROC
- **THEN** it gets no error

### Requirement: Help shows severities
Help SHALL show each code's default severity, the same as the catalog's.

#### Scenario: Help list
- **WHEN** Help is opened
- **THEN** each code is shown with its default severity, matching the backend catalog
