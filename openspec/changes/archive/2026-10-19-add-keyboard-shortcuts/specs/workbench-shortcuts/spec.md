# Spec Delta

## Purpose

Lets workbench users drive the main actions from the keyboard in every major browser, without risking text they typed.

## ADDED Requirements

### Requirement: Function keys
While the workbench is open, F1 SHALL open help, F5 SHALL check the JCL, F9 SHALL load the next sample and F12 SHALL clear the editor, each cancelling the browser's default where possible. Escape SHALL close help.

#### Scenario: F5 checks
- **WHEN** the user presses F5
- **THEN** the JCL is checked straight away and the page isn't reloaded

#### Scenario: F9 cycles samples
- **WHEN** the user presses F9 three times
- **THEN** all three samples are loaded in turn and the editor is back on the first

#### Scenario: Help with the keyboard
- **WHEN** the user presses F1, then Escape
- **THEN** help opens, then closes

#### Scenario: Keys while help is open
- **WHEN** help is open and the user presses F5
- **THEN** nothing is checked; F1 or Escape closes help

### Requirement: Fallback shortcuts
Ctrl or Cmd with Enter SHALL check the JCL, and Alt+H, Alt+S and Alt+C SHALL open help, load a sample and clear. Each PF button's tooltip SHALL show its F key and its fallback.

#### Scenario: Ctrl+Enter
- **WHEN** the user presses Ctrl+Enter
- **THEN** the JCL is checked

#### Scenario: Clear without F12
- **WHEN** the browser keeps F12 and the user presses Alt+C
- **THEN** the editor is cleared

#### Scenario: Tooltips
- **WHEN** the user hovers over each PF button
- **THEN** its tooltip names its F key and its fallback shortcut

### Requirement: Undo after replacing typed text
When F9 or F12 replaces text the user typed, an Undo notice SHALL show for 5 seconds, and using it SHALL restore the text exactly. Nothing SHALL be offered when there was nothing to lose.

#### Scenario: Empty editor
- **WHEN** the editor is empty and the user presses F12
- **THEN** nothing changes and no Undo notice appears

#### Scenario: Undo after F12
- **WHEN** the user's typed text is cleared with F12 and Undo is pressed
- **THEN** the text is restored exactly and `undo/f12` is counted

#### Scenario: Notice times out
- **WHEN** 5 seconds pass after F12 clears typed text
- **THEN** the Undo notice disappears

#### Scenario: Keyboard-only session
- **WHEN** a user writes a job, presses F5, F1 to read help, Escape to close it, and edits the JCL
- **THEN** each step works without the mouse
