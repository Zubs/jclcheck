# Spec Delta

## ADDED Requirements

### Requirement: NOTIFY statement placement
NOTIFY statements SHALL come after the JOB statement and before the job's first EXEC (`JCLO009` otherwise), and a job SHALL have at most 8 of them (`JCLO010` on the ninth).

#### Scenario: Several NOTIFY statements
- **WHEN** a job has three NOTIFY statements mixing EMAIL and USER before its first EXEC
- **THEN** no diagnostics are reported

#### Scenario: After the first EXEC
- **WHEN** a NOTIFY statement comes after the first EXEC
- **THEN** `JCLO009` is reported

#### Scenario: Too many
- **WHEN** a job has nine NOTIFY statements
- **THEN** `JCLO010` is reported on the ninth
