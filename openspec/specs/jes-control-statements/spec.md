# jes-control-statements Specification

## Purpose

Recognises the JES2 and JES3 control statements that real jobs carry alongside JCL, so they are checked rather than rejected as malformed lines.

## Requirements

### Requirement: JES2 statements recognised
Outside in-stream data, a line starting with `/*` followed immediately by a letter or `$` SHALL be read as a JES2 control statement and SHALL NOT get `JCLL001`. A job with no JES2 statements SHALL be checked exactly as before.

#### Scenario: One ROUTE statement
- **WHEN** `/*ROUTE PRINT NODE1` follows the JOB statement
- **THEN** no diagnostics are reported

#### Scenario: Nick's item 8
- **WHEN** Nick's item 8 example is checked
- **THEN** no diagnostics are reported

#### Scenario: JES2 command
- **WHEN** a `/*$VS,'D A'` line follows the JOB statement
- **THEN** it is read as a JES2 statement and gets no diagnostics

#### Scenario: Inside in-stream data
- **WHEN** `/*ROUTE PRINT NODE1` appears inside `DD *,DLM=$$` data
- **THEN** it is data, not a JES2 statement

#### Scenario: Delimiter still a delimiter
- **WHEN** `/*` followed by a blank ends `DD *` data
- **THEN** it is still read as the delimiter

#### Scenario: Production job
- **WHEN** a valid job with `/*JOBPARM LINES=100` and `/*ROUTE PRINT RMT5` after the JOB statement is checked
- **THEN** no diagnostics are reported

### Requirement: Known JES2 statement names
A JES2 statement whose name isn't one of `JOBPARM`, `MESSAGE`, `NETACCT`, `NOTIFY`, `OUTPUT`, `PRIORITY`, `ROUTE`, `SETUP`, `SIGNOFF`, `SIGNON`, `XEQ` or `XMIT` (or a `$` command) SHALL get a `JCLJ001` warning on its line, with a "Did you mean" suggestion when one is close.

#### Scenario: Misspelt ROUTE
- **WHEN** `/*ROUTEE PRINT NODE1` follows the JOB statement
- **THEN** `JCLJ001` is reported on that line, column 3, with the suggestion "Did you mean 'ROUTE'?"

### Requirement: ROUTE operand
`/*ROUTE` SHALL start with `PRINT`, `PUNCH` or `XEQ`, followed by a destination. Otherwise a `JCLJ002` warning SHALL list the allowed values.

#### Scenario: No operand
- **WHEN** `/*ROUTE` has no operand
- **THEN** `JCLJ002` is reported, naming PRINT, PUNCH and XEQ

#### Scenario: Wrong first word
- **WHEN** `/*ROUTE PRNT NODE1` is checked
- **THEN** `JCLJ002` is reported

#### Scenario: No destination
- **WHEN** `/*ROUTE PRINT` is checked
- **THEN** `JCLJ002` is reported

### Requirement: JES2 statement placement
`/*PRIORITY` SHALL come before the JOB statement. `/*JOBPARM`, `/*MESSAGE`, `/*NETACCT`, `/*NOTIFY`, `/*OUTPUT`, `/*ROUTE`, `/*SETUP`, `/*XEQ` and `/*XMIT` SHALL come after it. A statement in the wrong place SHALL get a `JCLJ003` warning, not `JCLL001`. `/*SIGNON`, `/*SIGNOFF` and `$` commands MAY appear anywhere.

#### Scenario: ROUTE before JOB
- **WHEN** `/*ROUTE PRINT NODE1` comes before the JOB statement
- **THEN** `JCLJ003` is reported on that line and no `JCLL001`

#### Scenario: PRIORITY after JOB
- **WHEN** `/*PRIORITY 5` comes after the JOB statement
- **THEN** `JCLJ003` is reported

#### Scenario: PRIORITY before JOB
- **WHEN** `/*PRIORITY 5` comes directly before the JOB statement
- **THEN** no diagnostics are reported
