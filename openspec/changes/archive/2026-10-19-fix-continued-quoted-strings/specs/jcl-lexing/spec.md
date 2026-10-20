# Spec Delta

## ADDED Requirements

### Requirement: Continued quoted strings
When a line's operand ends inside an open quote, the string SHALL run through column 71, with blanks added if the line stops short of it, and SHALL continue with the next line's text from column 16. Quote and parenthesis tracking SHALL run over the whole joined operand.

#### Scenario: Quoted value on one line
- **WHEN** a quoted value opens and closes on one line
- **THEN** it is read exactly as before this change

#### Scenario: Nick's item 3
- **WHEN** Nick's item 3 example is checked
- **THEN** no diagnostics are reported, and the PARM value is the whole sentence with `APOSTROPHES` joined

#### Scenario: Three lines
- **WHEN** a string is continued over three lines, each resuming in column 16
- **THEN** the parts are joined in order into one value

#### Scenario: First line ends at column 71
- **WHEN** the first line ends exactly at column 71
- **THEN** the continued text joins with no added blanks

#### Scenario: First line ends at column 60
- **WHEN** the first line ends at column 60
- **THEN** the value includes 11 blanks before the continued text

#### Scenario: Text after the closing quote
- **WHEN** the continuation line closes the string and then has `,DISP=SHR` and a comment
- **THEN** `DISP=SHR` is read as a further parameter and the comment is kept separate

### Requirement: Continuation column for quoted strings
A continued quoted string SHALL resume in column 16, with columns 3–15 blank. Otherwise a `JCLL005` error SHALL be reported on the continuation line at the column where the text starts, and the text SHALL still be joined.

#### Scenario: Resumes in column 16
- **WHEN** the continuation text starts in column 16
- **THEN** no `JCLL005` is reported

#### Scenario: Resumes in column 15 or 17
- **WHEN** the continuation text starts in column 15 or 17
- **THEN** `JCLL005` is reported on the continuation line at column 15 or 17, and its message names that column

### Requirement: Split doubled quote
When a line's quoted string closes exactly in column 71 and the next line starts with `//`, blanks in columns 3–15 and a quote in column 16, the two quotes SHALL be read as one literal quote inside a continued string.

#### Scenario: Doubled quote across the break
- **WHEN** `PARM='IT` is padded so its next `'` is in column 71, and the next line is `//` with a `'` in column 16 followed by `S FINE'`
- **THEN** one statement is produced, the value contains `IT''S FINE`, and no diagnostics are reported

### Requirement: Unterminated string reported once
A quoted string that is never closed, including after continuing, SHALL get `JCLL003` on its last line and SHALL NOT also get `JCLP003` because of the open quote.

#### Scenario: Never closed
- **WHEN** a string is continued in column 16 and still not closed when the next statement starts
- **THEN** `JCLL003` is reported on the last line of the string and no `JCLP003` is reported
