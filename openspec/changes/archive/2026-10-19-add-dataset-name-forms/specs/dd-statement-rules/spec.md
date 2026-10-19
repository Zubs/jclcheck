# Spec Delta

## ADDED Requirements

### Requirement: Members and generations in dataset names
A trailing bracketed part of a DSN SHALL be read separately from the qualifiers: a generation (`0`, `+n` or `-n`), or a member of 1–8 characters starting with a letter or `$ # @` and continuing with letters, digits or `$ # @`. An invalid member SHALL get a `JCLS010` warning naming the member and the rule. The 44-character limit SHALL apply to the name without the bracketed part. A DSN without a bracketed part SHALL be checked as before.

#### Scenario: Nick's item 13
- **WHEN** `//SYSUT1 DD DSN=NICK.BECKER(MYJOB),DISP=SHR` is checked
- **THEN** no diagnostics are reported

#### Scenario: Member and generation forms
- **WHEN** `A.B(MEM)`, `A.B(+1)` and `A.B(0)` are checked
- **THEN** none gets a diagnostic

#### Scenario: Member length
- **WHEN** a member of 8 characters and one of 9 are checked
- **THEN** the first is accepted and the second gets `JCLS010` naming the member

#### Scenario: 44 characters plus a member
- **WHEN** a 44-character name with a member is checked
- **THEN** no diagnostic is reported

#### Scenario: Bad members
- **WHEN** `A.B()` and `A.B(1MEM)` are checked
- **THEN** each gets `JCLS010` without a crash

### Requirement: Temporary dataset names
A DSN starting with `&&` SHALL be a temporary name of 1–8 characters starting with a letter or `$ # @`, optionally followed by a member; otherwise `JCLS006` SHALL be reported.

#### Scenario: Temporary names
- **WHEN** `&&TEMP` and `&&TEMP(MEM)` are checked
- **THEN** neither gets a diagnostic

#### Scenario: Empty temporary name
- **WHEN** `DSN=&&` is checked
- **THEN** `JCLS006` is reported without a crash

### Requirement: Quoted dataset names
A quoted DSN SHALL skip the qualifier checks and get one `JCLS014` info note saying it isn't checked.

#### Scenario: Quoted name
- **WHEN** `DSN='ODD.NAME'` is checked
- **THEN** only a `JCLS014` info note is reported
