# Spec Delta

## MODIFIED Requirements

### Requirement: NOTIFY on the JOB statement
`NOTIFY=` on the JOB statement SHALL be `&SYSUID` or a TSO user ID of 1–8 characters that starts with a letter or `$ # @` and continues with letters, digits or `$ # @` (either case), as the JCL Reference says. Any other value, including `node.userid` (which only `USER=` on the NOTIFY statement takes), an empty one or one mixing text with `&SYSUID`, SHALL get a `JCLS009` warning at the value that gives the length and character rules.

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
- **THEN** all three get `JCLS009` at column 19

#### Scenario: Bad first character and empty value
- **WHEN** `NOTIFY=1BMUSER` and `NOTIFY=` are checked
- **THEN** both get `JCLS009` without a crash

## ADDED Requirements

### Requirement: NOT sign aliases
In IF conditions, `^` and `!` SHALL be read as the NOT sign, with a warning that they may not be `¬` in every code page.

#### Scenario: Caret
- **WHEN** an IF condition is `(^S1.ABEND)`
- **THEN** it parses, and gets a warning at the `^`

### Requirement: Job group value rules
Job group keywords with a fixed set of values (such as `ACTION`, `OTHERWISE`, `FLUSHTYP`, `ONERROR` and `HOLD`) SHALL have value rules, and a value outside them SHALL get `JCLS009`.

#### Scenario: Bad ACTION
- **WHEN** an AFTER statement has `ACTION=NOPE`
- **THEN** it gets `JCLS009` listing the allowed values

### Requirement: Whole-parameter underlines
A diagnostic about a parameter or value SHALL have a `length` covering that parameter or value on its first line.

#### Scenario: Unknown keyword
- **WHEN** `REGON=4M` is an unknown keyword
- **THEN** its `JCLK001` has length 5

### Requirement: WHEN positions
A `WHEN=` condition written over several lines SHALL be reported at each character's own line and column.

#### Scenario: Second line
- **WHEN** a NOTIFY statement's `WHEN=(RC>4 &` continues with `XX=1)` on the next line
- **THEN** the condition error is reported on the second line, at `XX`
