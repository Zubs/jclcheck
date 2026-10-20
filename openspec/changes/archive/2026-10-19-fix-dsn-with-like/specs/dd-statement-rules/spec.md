# Spec Delta

## ADDED Requirements

### Requirement: LIKE is a model, not a data source
`LIKE=` SHALL NOT count as a data source. With DSN it SHALL be accepted; without DSN the DD SHALL count as a new temporary dataset. With `SYSOUT`, `*` or `DATA` it SHALL get `JCLD003` naming `LIKE` and the other parameter. Its value SHALL follow the dataset name rules, without a member or generation, and an empty value SHALL get `JCLS006`.

#### Scenario: DSN with LIKE
- **WHEN** `//NEW DD DSN=MY.NEW.FILE,LIKE=MY.MODEL.FILE,DISP=(NEW,CATLG)` is checked
- **THEN** no diagnostics are reported

#### Scenario: Any order
- **WHEN** `DSN=`, `LIKE=`, `DISP=(NEW,CATLG)`, `UNIT=SYSDA` and `SPACE=(CYL,(1,1))` are written in different orders
- **THEN** none gets a diagnostic

#### Scenario: LIKE with SYSOUT
- **WHEN** `//D DD LIKE=A.B,SYSOUT=*` is checked
- **THEN** `JCLD003` names LIKE and SYSOUT

#### Scenario: Empty LIKE
- **WHEN** `LIKE=` has no value
- **THEN** `JCLS006` is reported without a crash

#### Scenario: Still no source
- **WHEN** a DD has no DSN, no LIKE and no other source
- **THEN** `JCLD002` is still reported
