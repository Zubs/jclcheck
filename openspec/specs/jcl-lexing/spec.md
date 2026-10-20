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

### Requirement: Delimiter values
`DLM=` SHALL be accepted on DD statements. Its value SHALL be exactly two characters: letters, digits and `$ # @` written as they are, or any two characters in quotes, with `''` standing for one quote. Any other value SHALL get a `JCLS011` warning at the value's column, and the data SHALL then end as if no `DLM=` were given.

#### Scenario: Valid delimiters
- **WHEN** `DLM=@@`, `DLM=$$` or `DLM='%%'` is used on `DD *`
- **THEN** no diagnostic is reported for the value

#### Scenario: Invalid delimiters
- **WHEN** `DLM=@`, `DLM=@@@` or `DLM=` is used
- **THEN** `JCLS011` is reported at the value's column

### Requirement: Data ends at its delimiter
With a valid `DLM=`, in-stream data SHALL end only at a line that starts in column 1 with the delimiter, and `/*` and `//` lines SHALL be data. Without one, `DD *` data SHALL end at `/*` in columns 1–2 followed by a blank or the end of the line, or at the next `//` statement; `DD DATA` data SHALL end only at such a `/*`.

#### Scenario: Empty data
- **WHEN** `DD *` is followed directly by `/*`
- **THEN** the DD has an empty in-stream data block and no diagnostics are reported

#### Scenario: Nick's item 15
- **WHEN** `//SYSUT1 DD *,DLM=@@` is followed by `LINE ONE`, `/* NOT THE END` and `@@`
- **THEN** no diagnostics are reported, and the data holds both lines

#### Scenario: Delimiter must start in column 1
- **WHEN** a data line is ` @@` (starting in column 2) under `DLM=@@`
- **THEN** it is data, and the data ends at the next line starting `@@`

#### Scenario: Two delimiters in one step
- **WHEN** two DDs in a step use `DLM=@@` and `DLM=$$`
- **THEN** each ends at its own delimiter

#### Scenario: Slash-star data line with DLM
- **WHEN** a `/*` data line appears under `DLM=$$`
- **THEN** it is not reported as a statement and gets no `JCLL001`

#### Scenario: Slash-star comment ends default data
- **WHEN** `DD *` data is followed by `/* END OF DATA`
- **THEN** the data ends there

#### Scenario: DD DATA keeps JCL lines
- **WHEN** `DD DATA` data contains a `//` line and then `/*`
- **THEN** the `//` line is data and not a statement

#### Scenario: SORT card containing slash-star
- **WHEN** a `DD *,DLM=$$` block holds a SORT control card containing `/*` and ends with `$$`
- **THEN** the job checks clean

### Requirement: Missing delimiter
When `DD DATA` data or data with a valid `DLM=` reaches the end of the file without its delimiter, one `JCLL006` warning naming the delimiter SHALL be reported on the DD statement's line, and no diagnostics SHALL be reported on the data lines.

#### Scenario: Missing @@
- **WHEN** `DD *,DLM=@@` data runs to the end of the file
- **THEN** one `JCLL006` warning names `@@`

#### Scenario: DD star at end of file
- **WHEN** `DD *` data without `DLM=` runs to the end of the file
- **THEN** no `JCLL006` is reported

### Requirement: DLM without in-stream data
`DLM=` on a DD that has no in-stream data SHALL get a `JCLK006` warning at the keyword's column saying it has no effect.

#### Scenario: DLM on a dataset DD
- **WHEN** `//IN DD DSN=A.B,DISP=SHR,DLM=@@` is checked
- **THEN** `JCLK006` is reported at the `DLM` keyword

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
