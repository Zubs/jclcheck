# Spec Delta

## ADDED Requirements

### Requirement: Duplicate DD names are a warning
A DD name repeated within one step SHALL get one `JCLD001` warning for each repeat, compared without regard to case, whose message explains that both DDs are allocated but only one is reachable by that name. A job whose only problem is a duplicate DD SHALL count as valid. The same name in different steps SHALL NOT be reported.

#### Scenario: No DDs
- **WHEN** a step has no DD statements
- **THEN** no `JCLD001` is reported

#### Scenario: Nick's item 18
- **WHEN** Nick's item 18 example is checked
- **THEN** one `JCLD001` warning is reported on line 4, and the result is valid

#### Scenario: Three with the same name
- **WHEN** a step has three DDs named SYSUT2
- **THEN** two `JCLD001` warnings are reported

#### Scenario: Different steps
- **WHEN** two steps each have a DD named SYSUT2
- **THEN** no `JCLD001` is reported

#### Scenario: Case
- **WHEN** a step has DDs named `sysut2` and `SYSUT2`
- **THEN** one `JCLD001` warning is reported

#### Scenario: Not counted as an error
- **WHEN** a job's only problem is a duplicate DD
- **THEN** `stats.errors` is 0 and `stats.warnings` is 1
