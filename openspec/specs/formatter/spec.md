# formatter Specification

## Purpose

Lay out JCL in the standard columns with one action, keeping its meaning, and fix statements that run past column 71.

## Requirements

### Requirement: Standard layout
Formatting SHALL put the name in column 3, the operation in column 12 and the operand one blank after it, continued operands in column 16, and break operands after a comma so no text passes column 71, continuing a quoted string that is too long in column 16. It SHALL uppercase names, operations and keyword names and leave values as written. Formatting formatted JCL SHALL change nothing.

#### Scenario: Empty
- **WHEN** empty text is formatted
- **THEN** the result is empty

#### Scenario: Example
- **WHEN** `//STEP1 EXEC PGM=IEBGENER,REGION=0M,PARM='SOME LONG PARM',COND=(4,LT),TIME=5` is formatted
- **THEN** the result is `//STEP1    EXEC PGM=IEBGENER,REGION=0M,PARM='SOME LONG PARM',` followed by `//             COND=(4,LT),TIME=5`

#### Scenario: Repeatable
- **WHEN** formatted JCL is formatted again
- **THEN** nothing changes

#### Scenario: Column 71
- **WHEN** a statement ends exactly at column 71, and another would reach column 72
- **THEN** the first stays on one line and the second is broken at its last comma

### Requirement: Same meaning
Formatting SHALL leave comments, in-stream data, JES statements, IF conditions, quoted strings and statements with sequence numbers as written, leave a statement with an unmatched parenthesis as it is with a note, and refuse a result whose statements, parameters or diagnostics (apart from line length) differ from the input's, saying why.

#### Scenario: Kept text
- **WHEN** JCL with in-stream data, comments, a mixed-case PARM and `PATH='/u/MixedCase'` is formatted
- **THEN** they come out exactly as they went in

#### Scenario: Unmatched parenthesis
- **WHEN** a statement has an unmatched parenthesis
- **THEN** it is left unchanged and a note says why

### Requirement: Format everywhere
`POST /api/format` SHALL return the text and the changed lines; `jclcheck format` SHALL print or rewrite files; the workbench SHALL format with F4 or Alt+R, showing a preview that marks each changed line before anything changes, with Undo afterwards.

#### Scenario: API
- **WHEN** `POST /api/format` is called
- **THEN** it returns the text and the list of changed lines

#### Scenario: Workbench
- **WHEN** a user presses F4 and applies the preview
- **THEN** the editor holds the formatted JCL and Undo brings the old text back
