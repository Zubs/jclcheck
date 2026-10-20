# workbench-sharing Specification

## Purpose

Lets a user share a job — its JCL, library members, z/OS level and JES — as a link that reproduces it exactly in another browser, without storing anything on a server.

## Requirements

### Requirement: Creating a link
F6, Alt+L or the SHARE button SHALL put the JCL, library members, level and JES, compressed and base64url-encoded, after `#jcl=` in a `/app` link with `zos` and `jes` in the query, and copy it to the clipboard. If the clipboard is blocked the link SHALL be shown in a field to copy by hand. An empty editor, or a link longer than 32 KB, SHALL be refused with a message.

#### Scenario: Empty editor
- **WHEN** the user shares an empty editor
- **THEN** a short message says there's nothing to share and no link is made

#### Scenario: Copied link
- **WHEN** the user shares a job
- **THEN** a link starting `/app?zos=` with `#jcl=` is copied and `share/create` is counted

#### Scenario: Size limit
- **WHEN** a job's link would be just under 32 KB, and another's just over
- **THEN** the first is created and the second is refused with a message

#### Scenario: Clipboard blocked
- **WHEN** the clipboard can't be written
- **THEN** the link is shown in a field to copy by hand and `share/clipboard-blocked` is counted

### Requirement: Opening a link
Opening a link SHALL load its JCL, library members, level and JES and check them at once, without replacing the saved draft until the user edits the shared JCL. A notice SHALL offer "Back to my draft", which restores the draft exactly. A damaged or cut-off link SHALL show "This link is incomplete or damaged" and leave the draft alone.

#### Scenario: Round trip
- **WHEN** a link made from a job, two library members, level 2.5 and JES3 is opened in a fresh browser
- **THEN** all four are restored and the job is checked at 2.5 with JES3

#### Scenario: Back to my draft
- **WHEN** the user opens a link and chooses "Back to my draft"
- **THEN** the saved draft is restored exactly and `share/back-to-draft` is counted

#### Scenario: Draft kept until edited
- **WHEN** a link is opened and the user doesn't edit it
- **THEN** the saved draft is unchanged

#### Scenario: Damaged link
- **WHEN** the part after `#jcl=` is cut off or altered
- **THEN** "This link is incomplete or damaged" is shown and the draft is loaded as normal

### Requirement: Links stay private
The shared content SHALL only be in the part after `#`, which SHALL never be sent to a server or to analytics, and the canonical address SHALL stay `/app`.

#### Scenario: Canonical address
- **WHEN** a shared link is opened
- **THEN** the canonical tag is `/app`
