# workbench-editor Specification

## Purpose

Describes the workbench's JCL editor: what it shows about the text, the cursor and the diagnostics, and how it behaves while the user types.

## Requirements

### Requirement: Cursor position
The editor bar SHALL show the cursor's line and column, counted from 1, and the number of lines, as `LN 4 · COL 16 · 12 LINES`, updated on typing, clicks, key movement and selection.

#### Scenario: Empty editor
- **WHEN** the editor is empty
- **THEN** the bar shows `LN 1 · COL 1 · 1 LINES`

#### Scenario: After the slashes
- **WHEN** the cursor is placed just after `//` on line 1
- **THEN** the bar shows `COL 3`

#### Scenario: Moving around
- **WHEN** the cursor moves with arrow keys, Home, End or clicks
- **THEN** the bar updates each time

#### Scenario: End of an 80-character line
- **WHEN** the cursor is at the end of an 80-character line, and then before its last character
- **THEN** the bar shows `COL 81`, then `COL 80`

#### Scenario: Windows line endings
- **WHEN** text with `\r\n` line endings is in the editor
- **THEN** the line and column are still right

### Requirement: Selection length
When text is selected, the bar SHALL also show the number of selected characters (`SEL 24`), and SHALL hide it when the selection is cleared.

#### Scenario: Selecting 24 characters
- **WHEN** 24 characters are selected and the selection is then cleared
- **THEN** the bar shows `SEL 24`, and then no longer shows it

### Requirement: Column 72 stands out
A column of 72 or more SHALL be shown in a different style from columns up to 71.

#### Scenario: Columns 71 and 72
- **WHEN** the cursor is in column 71, then column 72
- **THEN** only column 72 is shown in the highlight style

### Requirement: Position on request for screen readers
The position SHALL NOT be announced on every change; activating the indicator SHALL announce it once.

#### Scenario: Asking for the position
- **WHEN** a screen-reader user activates the indicator
- **THEN** a polite live region announces "Line 4, column 16"

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
