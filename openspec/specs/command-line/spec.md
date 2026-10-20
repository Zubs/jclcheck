# command-line Specification

## Purpose

Check JCL files from a terminal or a CI pipeline, with the same results as the API, in text, JSON or SARIF, and an exit code that can fail a build.

## Requirements

### Requirement: Checking files
`jclcheck <files or globs>` SHALL check each file with the validator and the options `--zos`, `--jes`, `--library`, `--profile`, and print its diagnostics as `file:line:column  severity  code  message`. It SHALL exit with 0 when there are no errors, 1 when any file has an error or there are more warnings than `--max-warnings`, and 2 when it can't run, still checking the files it can read.

#### Scenario: No files
- **WHEN** `jclcheck` is run with no files
- **THEN** it prints its usage and exits with 2

#### Scenario: Clean file
- **WHEN** one clean file is checked
- **THEN** nothing is printed and it exits with 0

#### Scenario: One file with an error
- **WHEN** three files are checked and one has an error
- **THEN** that file's diagnostics are printed with its name and it exits with 1

#### Scenario: Max warnings
- **WHEN** `--max-warnings 2` is given
- **THEN** two warnings pass and three fail

#### Scenario: Missing file
- **WHEN** one of the files doesn't exist
- **THEN** a clear message is printed, the others are checked, and it exits with 2

### Requirement: Output formats
`--format json` SHALL print each file's diagnostics and stats, and `--format sarif` SHALL print SARIF 2.1.0 with a rule per code and each result at its file, line and column.

#### Scenario: SARIF
- **WHEN** files with an error and a warning are checked with `--format sarif`
- **THEN** each result has the right rule, level, file, line and column

### Requirement: Opt-in usage counting
The CLI SHALL count nothing unless the user opts in with `JCLCHECK_TELEMETRY=1` or `--telemetry`, and nothing when `DO_NOT_TRACK=1` is set. An opted-in run SHALL send one batch of allowed events to `POST /api/usage` with a 1-second limit, and a failure SHALL change neither the output nor the exit code. `JCLCHECK_TELEMETRY=debug` SHALL print the events and send nothing.

#### Scenario: Not opted in
- **WHEN** the CLI runs without an opt-in, or with an opt-in and `DO_NOT_TRACK=1`
- **THEN** nothing is sent

#### Scenario: Debug
- **WHEN** `JCLCHECK_TELEMETRY=debug` is set
- **THEN** the events are printed and nothing is sent

#### Scenario: Unreachable backend
- **WHEN** an opted-in run can't reach the backend
- **THEN** it finishes within a second more, with the same output and exit code

### Requirement: Validator package
The validator SHALL be its own dependency-free package in the repository, used by both the API and the CLI, so the CLI needs no Express.

#### Scenario: No Express
- **WHEN** the CLI runs from the validator package
- **THEN** it loads no module outside Node's built-ins and the validator

### Requirement: Built-in globs
The CLI SHALL expand `*`, `**` and `?` itself, without `fs.globSync`.

#### Scenario: Recursive glob
- **WHEN** `"jcl/**/*.jcl"` is given
- **THEN** every .jcl file under jcl/ is checked, in sorted order, with no warning
