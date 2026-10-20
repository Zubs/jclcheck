# Spec Delta

## ADDED Requirements

### Requirement: Syntax highlighting
The editor SHALL colour each line as it is typed, without waiting for the API: name field, operation, keyword names, values, quoted strings, comments, in-stream data, JES2 statements, column 72 and columns 73–80 each in their own style. An empty editor SHALL show no highlighting.

#### Scenario: Four parts of an EXEC
- **WHEN** `//STEP1 EXEC PGM=IEFBR14` is typed
- **THEN** the name, operation, keyword and value are shown in four different styles

#### Scenario: Samples
- **WHEN** each workbench sample is loaded
- **THEN** continuations, comments and in-stream data are highlighted as such

#### Scenario: Card columns
- **WHEN** a line has text in column 72 and columns 73–80
- **THEN** column 72 and columns 73–80 are styled differently from columns 1–71

#### Scenario: Unclosed quote
- **WHEN** a line has a quote that isn't closed
- **THEN** only the rest of that line is styled as a string

#### Scenario: API unreachable
- **WHEN** the API can't be reached
- **THEN** highlighting still works and only the underlines are missing

### Requirement: Diagnostic underlines
Each diagnostic SHALL underline the text from its column for its length in its severity colour, and hovering over the underlined text SHALL show its messages. The highlighted text SHALL stay aligned with the textarea when scrolling down and sideways.

#### Scenario: Underline position
- **WHEN** a diagnostic has line 2, column 5 and length 4
- **THEN** columns 5–8 of line 2 are underlined in the diagnostic's severity colour

#### Scenario: Hover
- **WHEN** the pointer rests on an underlined column
- **THEN** the editor's tooltip shows that diagnostic's code and message

#### Scenario: Scrolling
- **WHEN** the textarea is scrolled down and sideways
- **THEN** the highlight layer is scrolled by the same amounts

### Requirement: Readable colours
Every syntax colour SHALL have a contrast ratio of at least 4.5:1 against the editor background.

#### Scenario: Contrast
- **WHEN** the syntax colours of the workbench theme are compared with its editor background
- **THEN** each ratio is at least 4.5
