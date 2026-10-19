# Spec Delta

## Purpose

Let users hide diagnostics they know are wrong for their shop, with JCL comments that name the codes, and add their own site rules through a profile.

## ADDED Requirements

### Requirement: Inline suppressions
A `//* JCLCHECK OFF-NEXT` comment SHALL hide the named codes on the next statement, including all its lines. A `//* JCLCHECK OFF` comment SHALL hide them until a `//* JCLCHECK ON` for that code or the end of the job. Suppressed diagnostics SHALL be returned with `suppressed: true` and SHALL NOT count in `stats` errors, warnings, info or `valid`; `stats.suppressed` SHALL count them.

#### Scenario: OFF-NEXT
- **WHEN** `//* JCLCHECK OFF-NEXT JCLK001` comes before an EXEC with an unknown keyword
- **THEN** no `JCLK001` is shown and one suppressed diagnostic is returned

#### Scenario: OFF and ON
- **WHEN** an `OFF` names two codes and a later `ON` names one of them
- **THEN** both are hidden until the `ON`, and only the other one after it

#### Scenario: Next statement only
- **WHEN** `OFF-NEXT` comes before a continued statement followed by another
- **THEN** every line of the continued statement is covered and the following statement is not

#### Scenario: Not counted
- **WHEN** the only error is suppressed
- **THEN** `stats.errors` is 0 and the job is valid

### Requirement: Suppression notes
A suppression naming an unknown code, or none, SHALL get `JCLX001`, and one that hid nothing SHALL get `JCLX002`; both are information.

#### Scenario: Unknown code
- **WHEN** `//* JCLCHECK OFF JCLZ999` is written
- **THEN** `JCLX001` is reported at the code

### Requirement: Site profile
A `profile` SHALL add rules: `names` patterns for job, step and DD names (`*` and `%` wildcards), `allowed` values per keyword, `dsnPrefixes` for new datasets, `extraKeywords` accepted on JOB, EXEC and DD, and a `severity` (or `off`) per code. A broken rule SHALL get `JCLN002`, a warning naming the rule. An invalid profile SHALL get a 400 response naming the field. Patterns SHALL be matched in time linear in their length times the name's.

#### Scenario: Job name pattern
- **WHEN** the profile has job names `AR*` and classes A and B, and a job named `PAYROLL1` has `CLASS=C`
- **THEN** two `JCLN002` warnings name the pattern and the allowed values

#### Scenario: Bad profile
- **WHEN** the profile's job name pattern is a number
- **THEN** the API answers 400 naming `profile.names.job`

#### Scenario: Long pattern
- **WHEN** a pattern is 1,000 `*` characters
- **THEN** it is matched quickly

### Requirement: Workbench profile and suppressed list
The workbench SHALL have a PROFILE panel editing the profile as JSON, saved with the draft and included in shared links; JSON that doesn't parse SHALL not be sent and the panel SHALL say why. The diagnostics panel SHALL show the number suppressed and list them on request, and suppressed diagnostics SHALL not be underlined.

#### Scenario: Shared profile
- **WHEN** a teammate opens a link shared with a profile
- **THEN** their checks use that profile

#### Scenario: Suppressed list
- **WHEN** a result has a suppressed diagnostic
- **THEN** the panel shows "1 SUPPRESSED" and lists it only when that is clicked
