# Spec Delta

## MODIFIED Requirements

### Requirement: Frontend test command and exit status
Running `npm test` in the frontend SHALL run every component test once in a simulated browser and print how many tests passed and failed. It SHALL exit with a non-zero status when any test fails, and with zero otherwise. Tests SHALL make no network requests, SHALL NOT load the real analytics script, and SHALL NOT need the backend to be running.

#### Scenario: All frontend tests pass
- **WHEN** every frontend test passes
- **THEN** `npm test` in the frontend exits with status 0 and prints the counts

#### Scenario: A component change breaks a test
- **WHEN** a developer changes the workbench's status text for a clean result, and then runs `npm test` in the frontend
- **THEN** it exits with a non-zero status and names the failing test

#### Scenario: Backend not running
- **WHEN** the frontend tests run with no backend listening and no network access
- **THEN** they all run and no test tries to reach the API

#### Scenario: Analytics script never loaded
- **WHEN** the frontend tests run
- **THEN** no test adds GoatCounter's script to the page, and analytics tests use a fake GoatCounter instead
