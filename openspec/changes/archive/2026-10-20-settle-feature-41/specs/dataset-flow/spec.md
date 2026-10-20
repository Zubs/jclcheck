# Spec Delta

## ADDED Requirements

### Requirement: Unqualified overrides and DCB referbacks
A DD override without a procedure step name on a step calling a PROC SHALL apply to the PROC's first step. `DCB=*.STEP.DD` referbacks SHALL be checked like DSN referbacks.

#### Scenario: Unqualified override
- **WHEN** `//OUT DD DSN=&&B` overrides OUT in the first step of the called PROC
- **THEN** the flow uses `&&B`

#### Scenario: DCB referback
- **WHEN** `DCB=*.S9.OUT` names no earlier step
- **THEN** `JCLF005` is reported
