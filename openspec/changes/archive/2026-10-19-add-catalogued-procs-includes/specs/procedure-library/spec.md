# Spec Delta

## Purpose

Lets the user supply the catalogued procedures and INCLUDE members a job uses, so they are found in the job's search order and checked, with their problems reported against the right member and line.

## ADDED Requirements

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
