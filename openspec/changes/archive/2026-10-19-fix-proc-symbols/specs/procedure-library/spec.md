# Spec Delta

## ADDED Requirements

### Requirement: Symbols resolved per call
A symbol in a procedure body SHALL be defined when it has a default on the PROC statement, is set by a SET statement earlier in the same job, is given on the calling EXEC, or is a JCL system symbol such as `SYSUID`. `&&name` SHALL never be treated as a symbol. For each call, an undefined symbol SHALL get one `JCLR002` at the symbol in the procedure body, naming the calling step. A procedure that is never called SHALL be checked against its own defaults.

#### Scenario: No symbols
- **WHEN** a PROC uses no symbols
- **THEN** no `JCLR002` is reported

#### Scenario: Temporary dataset
- **WHEN** a PROC body has `DSN=&&WORK`
- **THEN** no `JCLR002` is reported

#### Scenario: SET, SYSUID and EXEC override
- **WHEN** a job SETs HLQ, calls a PROC using `&&WORK`, `&SYSUID..DATA` and `&HLQ..&ENV..DATA` with `ENV=TEST` on the EXEC
- **THEN** no diagnostics are reported

#### Scenario: Called twice
- **WHEN** the same PROC is called once with `ENV=TEST` and once without
- **THEN** one `JCLR002` is reported, naming the second calling step

#### Scenario: SET before and after
- **WHEN** a SET defines the symbol on the line before the calling EXEC, and in another job a SET comes after the EXEC
- **THEN** the first call has no `JCLR002` and the second does

#### Scenario: Stray ampersands
- **WHEN** a value has `&&` on its own or `&` at its end
- **THEN** validation finishes without a crash

### Requirement: Symbols accepted on the calling EXEC
On an EXEC that calls a procedure, a keyword naming a symbol used in the procedure body SHALL be accepted. Any other unknown keyword SHALL get `JCLK001` saying it is neither an EXEC keyword nor a symbolic parameter of that procedure.

#### Scenario: Override with no default
- **WHEN** `//S EXEC P,ENV=TEST` calls a PROC that uses `&ENV` with no default
- **THEN** no `JCLK001` is reported

#### Scenario: Unknown keyword
- **WHEN** `//S EXEC P,XYZ=1` calls a PROC that doesn't use `&XYZ`
- **THEN** `JCLK001` says 'XYZ' is not an EXEC keyword or a symbolic parameter of procedure 'P'

### Requirement: Dataset names with symbols aren't checked
A dataset name containing a symbolic parameter anywhere SHALL NOT be checked against the naming rules, since its real value isn't known; a temporary name (`&&name`) SHALL still be checked.

#### Scenario: Symbol in the middle
- **WHEN** `DSN=PROD.&ENV..DATA` is checked
- **THEN** no dataset name diagnostic is reported
