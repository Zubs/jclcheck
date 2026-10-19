# workbench-library Specification

## Purpose

Gives workbench users a place to paste the catalogued procedures and INCLUDE members their job uses, and shows problems inside those members where they are.

## Requirements

### Requirement: Library panel
The workbench SHALL have a Library panel, opened from the header, that lists members with a library name, a member name and the member's text in an editor with line numbers and gutter markers. Members SHALL be added and removed there, and every check SHALL send them with the JCL.

#### Scenario: Adding a member
- **WHEN** the user opens the Library panel, adds a member and types its text
- **THEN** the next check sends that member in `library`, and `library/add` is counted

#### Scenario: Removing a member
- **WHEN** the user removes a member
- **THEN** later checks don't send it, and `library/remove` is counted

### Requirement: Diagnostics in members
A diagnostic with a `member` SHALL be shown as the member name and location (`MYPROC2 L3:5`). Clicking it SHALL open the Library panel at that member and line.

#### Scenario: Member diagnostic
- **WHEN** a check returns a diagnostic with `member: "CAMPBEL.PROCS.JCL(MYPROC2)"` and line 3
- **THEN** the panel shows `MYPROC2 L3:5`, and clicking it opens the Library panel with MYPROC2's editor scrolled to line 3

### Requirement: Library stays private
Library member text SHALL never be sent to analytics.

#### Scenario: Marker in a member
- **WHEN** a member's text contains a unique marker and the user checks the job
- **THEN** the marker is in the API request and in no analytics call
