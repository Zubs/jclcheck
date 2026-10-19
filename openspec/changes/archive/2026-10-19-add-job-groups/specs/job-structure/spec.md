# Spec Delta

## ADDED Requirements

### Requirement: Job groups
`JOBGROUP`, `ENDGROUP`, `GJOB`, `JOBSET`, `SJOB`, `ENDSET`, `AFTER`, `BEFORE` and `CONCURRENT` SHALL be recognised and their keywords checked. A stream with no job group SHALL be checked as before, and one holding only a job group SHALL NOT get `JCLO001`.

#### Scenario: One job
- **WHEN** a JOBGROUP with one GJOB and a matching ENDGROUP is checked
- **THEN** no diagnostics are reported

#### Scenario: Nick's item 5
- **WHEN** Nick's item 5 example is checked
- **THEN** no diagnostics are reported

### Requirement: Job group structure
A group SHALL be closed by an `ENDGROUP` with the same name (`JCLG001`, `JCLG002`, `JCLG003`) and a job set by `ENDSET` (`JCLG005`). `SJOB` SHALL be inside a set (`JCLG006`). Job names SHALL be valid and unique in the group (`JCLN001`, `JCLG004`). Group statements SHALL be inside a group (`JCLG010`).

#### Scenario: Job name length
- **WHEN** GJOB names of 8 and 9 characters are checked
- **THEN** the first is accepted and the second gets `JCLN001`

#### Scenario: Mismatched and missing ENDGROUP
- **WHEN** an ENDGROUP has a different name, and another group has no ENDGROUP
- **THEN** the first gets `JCLG001` and the second `JCLG002`

#### Scenario: Job sets
- **WHEN** a JOBSET with two SJOBs is closed by ENDSET
- **THEN** no diagnostics are reported

### Requirement: Job group dependencies
`AFTER`, `BEFORE` and `CONCURRENT` SHALL follow a `GJOB` or `SJOB` (`JCLG007`), and their `NAME=` SHALL name a job in the group (`JCLG008`, on that line, listing the group's jobs). `WHEN=` SHALL be a valid condition. A dependency cycle SHALL be reported once with `JCLG009`, naming every job in the loop.

#### Scenario: Unknown job
- **WHEN** `AFTER NAME=Z` names a job not in the group
- **THEN** `JCLG008` is reported on that line, listing the group's jobs

#### Scenario: AFTER before any job
- **WHEN** an AFTER statement comes straight after JOBGROUP
- **THEN** `JCLG007` is reported

#### Scenario: Cycle
- **WHEN** A runs after C, B after A and C after B
- **THEN** one `JCLG009` names A, B and C

#### Scenario: Joining a group
- **WHEN** a four-job group is followed by a job with `// SCHEDULE JOBGROUP=MULTI`
- **THEN** everything checks clean
