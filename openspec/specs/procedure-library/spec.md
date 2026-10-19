# procedure-library Specification

## Purpose

Lets the user supply the catalogued procedures and INCLUDE members a job uses, so they are found in the job's search order and checked, with their problems reported against the right member and line.

## Requirements

### Requirement: Library in the API
`POST /api/validate` SHALL accept an optional `library` of at most 50 entries `{ dsn, member, source }`, where `dsn` is optional and `member` is a 1–8 character member name. More than 50 entries, or an entry with an invalid library or member name, SHALL get a 400 response naming the entry. With an empty or missing library, results SHALL be exactly as before.

#### Scenario: Empty library
- **WHEN** a job calling an unknown PROC is checked with an empty library
- **THEN** `JCLR001` is reported as before

#### Scenario: Fifty and fifty-one members
- **WHEN** requests with 50 and 51 library entries are sent
- **THEN** the first is accepted and the second gets 400

#### Scenario: Bad entry
- **WHEN** an entry has member `1BAD`
- **THEN** the response is 400 and names that entry

### Requirement: Catalogued procedures
A PROC call that isn't in-stream SHALL be looked up in the job's JCLLIB `ORDER=` libraries in order, then in entries without a library. A procedure found SHALL be checked like an in-stream procedure; its PROC and PEND statements are optional.

#### Scenario: Procedure in the library
- **WHEN** a job calls MYPROC2 and the library holds MYPROC2 with an unknown keyword on line 2
- **THEN** there is no `JCLR001`, and the `JCLK001` carries `member` and line 2 of the member

#### Scenario: First library wins
- **WHEN** two JCLLIB libraries both hold MYPROC and the first one's copy has a mistake
- **THEN** the mistake from the first library's copy is reported

#### Scenario: Nick's item 17 fixed
- **WHEN** Nick's item 17 job with the JCLLIB moved into place is checked with MYPROC2 in `CAMPBEL.PROCS.JCL`
- **THEN** MYPROC2's steps are checked and there is no `JCLR001`

### Requirement: INCLUDE members
`INCLUDE MEMBER=name` SHALL be replaced by the member's statements before parsing, using the same search order. A member not found SHALL get a `JCLR005` warning. Includes MAY nest up to 15 levels (`JCLR007` deeper); a member that includes itself SHALL get one `JCLR006` and validation SHALL finish. JOB, PROC, PEND and JCLLIB inside an INCLUDE member SHALL get `JCLR008`.

#### Scenario: Nested includes
- **WHEN** a job includes two members and one of them includes a third
- **THEN** the job is checked as if all the statements were written in place

#### Scenario: Nesting limit
- **WHEN** includes nest 15 deep, and another chain 16 deep
- **THEN** the first is accepted and the second gets `JCLR007`

#### Scenario: Loop
- **WHEN** a member includes itself
- **THEN** one `JCLR006` is reported and validation finishes

#### Scenario: JOB in a member
- **WHEN** an INCLUDE member contains a JOB statement
- **THEN** `JCLR008` is reported against the member

#### Scenario: Missing member
- **WHEN** `INCLUDE MEMBER=NOPE` names no library entry
- **THEN** a `JCLR005` warning says the member can be added in the Library panel

### Requirement: Member locations
A diagnostic found inside a library member SHALL carry a `member` field (`LIB(MEMBER)`, or the member name when it has no library) and the line and column within that member.

#### Scenario: Line in the member
- **WHEN** a mistake is on line 3 of an included member that is included at line 10 of the job
- **THEN** the diagnostic has the member's name and line 3

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
