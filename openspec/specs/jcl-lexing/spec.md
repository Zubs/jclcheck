# jcl-lexing Specification

## Purpose

Defines how raw JCL text is read into statements the way z/OS reads 80-column records: which columns hold the statement, how statements and comments continue, and how in-stream data is passed through.

## Requirements

### Requirement: Statement columns
For JCL statements, comment statements, null statements and in-stream data delimiters, only columns 1–71 SHALL be read as statement text. Column 72 SHALL be the continuation column. Columns 73–80 SHALL be ignored.

#### Scenario: Character in column 71
- **WHEN** a statement's operand ends exactly in column 71 and column 72 is blank
- **THEN** the character in column 71 is part of the operand

#### Scenario: Sequence numbers
- **WHEN** a line of exactly 80 characters has `00010000` in columns 73–80 and a blank column 72
- **THEN** no diagnostics are caused by the sequence numbers

#### Scenario: Card-image job
- **WHEN** a valid job with sequence numbers in columns 73–80 of every line, including the `/*` delimiter and the `//` null statement, is checked
- **THEN** no diagnostics are reported

#### Scenario: Nothing in column 72
- **WHEN** a statement has a blank column 72 and no comment
- **THEN** it is read exactly as before this change

### Requirement: Continued comments
When a statement's operand is complete and column 72 of its last line is not blank, each following line that starts with `//` and has a blank column 3 SHALL be added to the statement's comment and SHALL NOT be parsed. This SHALL continue while each added line has a non-blank column 72. Diagnostics for the statement SHALL point to the line where it starts.

#### Scenario: One comment line
- **WHEN** a statement with a comment and an `X` in column 72 is followed by `//     MORE COMMENT`
- **THEN** one statement is produced and its comment contains both parts

#### Scenario: Nick's item 2
- **WHEN** Nick's item 2 example is checked
- **THEN** its EXEC statement spans lines 2–6, no operation is `THE` or `FOR`, and there is no `JCLP002`

#### Scenario: Continued operand with a marked column 72
- **WHEN** a line ends its operand with a comma, has a comment and a non-blank column 72, and the next line continues the operand
- **THEN** the operand is continued as normal and the comment is kept separate

### Requirement: Continuation expected
When column 72 is marked but the next line doesn't continue the statement, a `JCLL004` error SHALL be reported at column 72 of the marked line. The following line SHALL still be read as its own statement.

#### Scenario: Next line is a new statement
- **WHEN** column 72 is marked and the next line has a non-blank column 3
- **THEN** `JCLL004` is reported on the marked line at column 72, and the next line is read as a new statement

#### Scenario: Mark on the last line
- **WHEN** column 72 is marked on the last line of the file
- **THEN** `JCLL004` is reported without a crash

### Requirement: In-stream data kept whole
In-stream data lines SHALL be passed through with all their columns.

#### Scenario: Data in columns 73–80
- **WHEN** an in-stream data line has text in columns 73–80
- **THEN** that text is kept in the DD statement's in-stream data

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
