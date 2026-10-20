# keyword-explanations Specification

## Purpose

Explain JCL keywords and their values in plain English where the user is looking, so learners understand a job without opening the reference.

## Requirements

### Requirement: Keyword descriptions
Every keyword in the JOB, EXEC, DD, JCLLIB, NOTIFY and job group keyword tables SHALL have a description, and so SHALL every allowed value in their value rules; DISP, SPACE and MSGLEVEL SHALL be described by position. `GET /api/keywords?zos=<level>` SHALL return the descriptions of the keywords available at that level, with the level each appeared in and a reference link, and an unknown level SHALL get a 400 response.

#### Scenario: Complete
- **WHEN** the descriptions are compared with the keyword tables
- **THEN** every keyword and allowed value has one

#### Scenario: Level
- **WHEN** descriptions are asked for at z/OS 3.1
- **THEN** the response is for 3.1

### Requirement: Hover explanations
Hovering over a keyword or value in the editor SHALL show its description, each part of its value in turn, the level it appeared in and its reference link, below any diagnostic at the same place. Blank space and comments SHALL show nothing; an unknown keyword SHALL show "No description: not a known keyword". Alt+K SHALL show the same for the keyword at the cursor. Without the descriptions, hovering SHALL show nothing and checking SHALL carry on.

#### Scenario: DISP=SHR
- **WHEN** the pointer is over `SHR` in `DISP=SHR`
- **THEN** the panel shows "Use an existing dataset; other jobs may read it at the same time."

#### Scenario: Three parts
- **WHEN** the pointer is over any part of `(NEW,CATLG,DELETE)`
- **THEN** all three parts are explained in order

#### Scenario: Edges
- **WHEN** the pointer is over the first or last character of a keyword, and then the blank after it
- **THEN** the keyword is explained, and then nothing is shown

#### Scenario: Unreachable
- **WHEN** `/api/keywords` can't be reached
- **THEN** hovering shows nothing and the JCL is still checked

### Requirement: Exact reference links
Each keyword's reference link SHALL open its own page of the IBM JCL Reference where one is known, and a search only otherwise.

#### Scenario: DISP
- **WHEN** DISP's explanation is shown
- **THEN** its link opens the DISP parameter page of the JCL Reference
