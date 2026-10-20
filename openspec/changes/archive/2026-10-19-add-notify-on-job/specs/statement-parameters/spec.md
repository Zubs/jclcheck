# Spec Delta

## ADDED Requirements

### Requirement: NOTIFY on the JOB statement
`NOTIFY=` on the JOB statement SHALL be `&SYSUID`, a TSO user ID of 1–8 characters that starts with a letter or `$ # @` and continues with letters, digits or `$ # @` (either case), or `node.userid` with a node of the same form. Any other value, including an empty one or one mixing text with `&SYSUID`, SHALL get a `JCLS009` warning at the value that gives the length and character rules.

#### Scenario: No NOTIFY
- **WHEN** a JOB statement has no NOTIFY
- **THEN** no NOTIFY diagnostic is reported

#### Scenario: SYSUID and a user ID
- **WHEN** `NOTIFY=&SYSUID` and `NOTIFY=IBMUSER` are checked
- **THEN** neither gets a diagnostic

#### Scenario: Eight and nine characters
- **WHEN** `NOTIFY=ABCDEFGH` and `NOTIFY=ABCDEFGHI` are checked
- **THEN** the first is accepted and the second gets `JCLS009` naming the 1-8 character rule

#### Scenario: Nick's item 7
- **WHEN** `NOTIFY=IBMUSERRRRRRRR`, `NOTIFY=laskdjasd1.&SYSUID` and `NOTIFY=N1.IBMUSER` are checked
- **THEN** the first two get `JCLS009` at column 19, and the third is accepted until feature 41 decides on `node.userid`

#### Scenario: Bad first character and empty value
- **WHEN** `NOTIFY=1BMUSER` and `NOTIFY=` are checked
- **THEN** both get `JCLS009` without a crash
