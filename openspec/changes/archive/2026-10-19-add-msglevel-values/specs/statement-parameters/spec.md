# Spec Delta

## ADDED Requirements

### Requirement: MSGLEVEL values
`MSGLEVEL` SHALL take at most two sub-parameters: statements (0, 1 or 2) and messages (0 or 1). Either MAY be omitted, but not both. Any other form SHALL get one `JCLS009` warning at the value, saying which sub-parameter is wrong.

#### Scenario: No MSGLEVEL
- **WHEN** a JOB statement has no MSGLEVEL
- **THEN** no MSGLEVEL diagnostic is reported

#### Scenario: Valid forms
- **WHEN** `MSGLEVEL=(1,1)`, `MSGLEVEL=1`, `MSGLEVEL=(2)`, `MSGLEVEL=(,0)`, `MSGLEVEL=(0,1)` and `MSGLEVEL=(2,1)` are checked
- **THEN** none gets a diagnostic

#### Scenario: Out of range
- **WHEN** `MSGLEVEL=(3,1)` and `MSGLEVEL=(2,2)` are checked
- **THEN** each gets `JCLS009`, and the second says "messages must be 0 or 1; found '2'"

#### Scenario: Too many sub-parameters
- **WHEN** `MSGLEVEL=(1,1,1)` is checked
- **THEN** `JCLS009` is reported

#### Scenario: Malformed values
- **WHEN** `MSGLEVEL=()`, `MSGLEVEL=(A,B)` and `MSGLEVEL=(1,1` are checked
- **THEN** each gets a clear diagnostic and none crashes

#### Scenario: Nick's item 6
- **WHEN** `MSGLEVEL=(1,1,1,5)` is checked
- **THEN** one `JCLS009` explains the two allowed sub-parameters, and `MSGLEVEL=(1,1)` checks clean
