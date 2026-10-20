# Spec Delta

## ADDED Requirements

### Requirement: Positions on continued statements
A diagnostic about a parameter or value SHALL point to the physical line and column where that parameter or value is written, including on continuation lines. A diagnostic about a whole statement SHALL point to its first line. A one-line statement SHALL keep the same positions as before.

#### Scenario: One line
- **WHEN** a one-line statement has an unknown keyword
- **THEN** it is reported at the same line and column as before

#### Scenario: SPACE on the third line
- **WHEN** a DD written over lines 3–5 has `SPACE=(FOO,(1,1))` on line 5 starting at column 12
- **THEN** `JCLS002` is reported at line 5, column 18, where the value starts

#### Scenario: A problem on each line
- **WHEN** a DD spread over four lines has a problem on each of lines 2, 3 and 4
- **THEN** each of the three diagnostics is on its own line

#### Scenario: Continuation start columns
- **WHEN** a continued parameter starts in column 4, and another in column 16
- **THEN** they are reported at columns 4 and 16

#### Scenario: Continued quoted string
- **WHEN** a value with a quoted string continued onto the next line breaks a rule
- **THEN** it is reported where the value starts

### Requirement: Unmatched parentheses located
An unmatched parenthesis SHALL be reported at the line and column of the `(` that isn't closed, or of the `)` that has no opener.

#### Scenario: Second line of three
- **WHEN** an unclosed `(` is on the second line of a three-line statement
- **THEN** `JCLP003` is reported on the second line, at the `(`

### Requirement: Columns stay on the line
Every diagnostic on the fixtures SHALL have a column within its line (at most one past its last character).

#### Scenario: All fixtures
- **WHEN** every fixture is checked
- **THEN** no diagnostic's column is more than one past the end of its line
