# Spec Delta

## ADDED Requirements

### Requirement: Only the newest check's result is shown
The workbench SHALL show the result of the newest check only. Starting a check SHALL abort the one in flight, and a reply or failure from an older check SHALL be ignored. An aborted check SHALL not be reported as an error. "VALIDATING" SHALL stay on until the newest check finishes.

#### Scenario: Opening the workbench
- **WHEN** the workbench opens
- **THEN** one check is sent and its result is shown

#### Scenario: Quick edits on a slow network
- **WHEN** five quick edits are made and the replies arrive out of order
- **THEN** only the last edit's result is ever shown

#### Scenario: Older reply after a newer one
- **WHEN** an older check's reply arrives after the newest one's
- **THEN** the panel keeps the newest result

#### Scenario: Validating until the newest reply
- **WHEN** an older check finishes while a newer one is still running
- **THEN** the header still shows "VALIDATING"

#### Scenario: Newest check fails
- **WHEN** the newest check fails and an older one succeeds later
- **THEN** "API UNREACHABLE" is shown

#### Scenario: Abort passed to fetch
- **WHEN** `validateJcl` is given a `signal`
- **THEN** it is passed to `fetch`
