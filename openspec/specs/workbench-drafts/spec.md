# workbench-drafts Specification

## Purpose

Keeps a user's JCL and library members in their own browser between visits, without ever sending them anywhere but to the API for checking.

## Requirements

### Requirement: Draft saved and restored
The editor text and Library members SHALL be saved in browser storage half a second after the last change, and loaded on the next visit. With nothing saved, the clean sample SHALL be shown.

#### Scenario: Nothing saved
- **WHEN** the workbench opens with no saved draft
- **THEN** the clean sample is shown

#### Scenario: Typed job comes back
- **WHEN** the user types a job, waits half a second and reloads
- **THEN** the same job is shown

#### Scenario: Cleared editor
- **WHEN** the user clears the editor and reloads
- **THEN** the editor is empty, not the sample

#### Scenario: Job and library
- **WHEN** a job and three library members are saved and the workbench is opened again
- **THEN** the job and all three members are restored

### Requirement: Storage problems don't stop the workbench
If storage can't be read or written, the workbench SHALL work as normal and show, once per visit, that the draft isn't being saved. A saved draft that can't be read SHALL be ignored and the sample shown, with no error.

#### Scenario: Blocked storage
- **WHEN** every storage access throws
- **THEN** the sample is shown, checks work, and the not-saved notice appears once

#### Scenario: Corrupted draft
- **WHEN** the saved draft isn't valid
- **THEN** the sample is shown with no error

#### Scenario: Notice only on failure
- **WHEN** storage works
- **THEN** no not-saved notice is shown
