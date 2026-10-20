# Spec Delta

## ADDED Requirements

### Requirement: NOTIFY statement keywords
The NOTIFY statement SHALL accept `EMAIL`, `USER`, `TYPE` and `WHEN` only. `EMAIL` SHALL be a quoted address of up to 246 characters with exactly one `@`; `USER` SHALL follow the NOTIFY user ID rule; `TYPE` SHALL be `MSG` or `EMAIL`; `WHEN` SHALL be a condition in brackets or quotes. A value breaking its rule SHALL get `JCLS009`.

#### Scenario: USER only
- **WHEN** `//N1 NOTIFY USER=IBMUSER` follows the JOB statement
- **THEN** no diagnostics are reported

#### Scenario: Nick's item 12
- **WHEN** `//N1   NOTIFY USER=IBMUSER,TYPE=EMAILaasdasd` is checked
- **THEN** `JCLS009` is reported at column 33, listing MSG and EMAIL

#### Scenario: EMAIL length
- **WHEN** an EMAIL address of 246 characters and one of 247 are checked
- **THEN** the first is accepted and the second gets `JCLS009`

#### Scenario: EMAIL without @ or quotes
- **WHEN** `EMAIL='nick'` and an unquoted address are checked
- **THEN** both get `JCLS009` saying the address must be quoted with one @

#### Scenario: EMAIL on the JOB statement
- **WHEN** `EMAIL='nick'` is used on the JOB statement
- **THEN** `JCLS009` is reported

#### Scenario: WHEN condition
- **WHEN** `WHEN=(RC>4)` and `WHEN=(RC => 4)` are checked
- **THEN** the first is accepted and the second gets a `JCLC001`

### Requirement: EMAIL or USER on NOTIFY
A NOTIFY statement SHALL have `EMAIL` or `USER`: with neither, `JCLK002` SHALL ask for one; with both, `JCLK007` SHALL report the conflict.

#### Scenario: No parameters
- **WHEN** `//N1 NOTIFY` has no parameters
- **THEN** `JCLK002` asks for EMAIL or USER

#### Scenario: Both
- **WHEN** a NOTIFY statement has both EMAIL and USER
- **THEN** `JCLK007` is reported
