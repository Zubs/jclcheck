# dataset-flow Specification

## Purpose

Follow each dataset through a job's steps, report mistakes that only show across steps, and show the flow as a grid.

## Requirements

### Requirement: Dataset flow checks
The validator SHALL follow each dataset through the steps of each job, including the steps of called PROCs, and of each PROC nobody calls, and report `JCLF001` (temporary dataset read before it is created or passed, error), `JCLF002` (passed but never read, warning), `JCLF003` (created with `NEW,CATLG` twice with no delete between, warning) and `JCLF004` (read after a delete, warning). Each SHALL name the dataset and the step that created, passed or deleted it.

#### Scenario: No datasets
- **WHEN** no DD has a DSN
- **THEN** there are no `JCLF` diagnostics and `datasets` is empty

#### Scenario: Mistyped temporary name
- **WHEN** step S1 passes `&&SORTED` (line 3) and step S2 reads `&&SORTD` (line 5)
- **THEN** `JCLF001` is reported on line 5 and `JCLF002` on line 3

#### Scenario: Create, read, delete
- **WHEN** three steps create, read and delete a temporary dataset in that order
- **THEN** there are no diagnostics

#### Scenario: MOD creates
- **WHEN** the first step has `DSN=&&TEMP,DISP=MOD`
- **THEN** it is accepted

#### Scenario: Unknown symbol
- **WHEN** a DSN is `&HLQ..DATA` and `HLQ` has no known value
- **THEN** it is skipped without a crash

#### Scenario: Conditional reader
- **WHEN** the step that reads a never-created temporary dataset is inside an IF
- **THEN** `JCLF001` is a warning

### Requirement: Referbacks
A referback in `DSN`/`DSNAME` or `VOL=REF=` that names a step or DD that doesn't exist or comes later SHALL be reported as `JCLF005`, an error.

#### Scenario: Same step
- **WHEN** a DD refers back to an earlier DD in the same step, and another to a later one
- **THEN** the first is accepted and the second gets `JCLF005`

### Requirement: Datasets in the response and grid
The API response SHALL include `datasets`: each job's datasets with the steps that touch them and how (`N`, `R`, `M`, `P`, `D`). The diagnostics panel SHALL have a DATASETS tab showing a grid of datasets by steps, where clicking a cell goes to that DD.

#### Scenario: Grid row
- **WHEN** three steps create, read and delete a dataset
- **THEN** its row shows `N`, `R` and `D` in the three step columns

#### Scenario: Cell click
- **WHEN** a grid cell is clicked
- **THEN** the editor goes to that DD's line
