# Spec Delta

## Purpose

Describes the workbench's JCL editor: what it shows about the text, the cursor and the diagnostics, and how it behaves while the user types.

## ADDED Requirements

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
