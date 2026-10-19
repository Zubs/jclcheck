# Spec Delta

## ADDED Requirements

### Requirement: IF conditions are parsed
The condition of every IF statement, from after `IF` to `THEN`, SHALL be parsed as an expression of `RC`, `ABEND`, `¬ABEND`, `ABENDCC`, `RUN` and `¬RUN` (optionally qualified by a step, or a step and procedure step), comparison operators (`GT GE LT LE EQ NE > >= < <= = ¬=`), `NOT`/`¬`, `AND`/`&`, `OR`/`|` and brackets. A job without IF statements SHALL be checked exactly as before.

#### Scenario: No IF statements
- **WHEN** a job has no IF statements
- **THEN** its diagnostics are unchanged

#### Scenario: Simple condition
- **WHEN** `// IF (STEP1.RC = 0) THEN` follows a step STEP1
- **THEN** no diagnostics are reported

#### Scenario: Combined condition
- **WHEN** `// IF (S1.RC = 0 & ¬S2.ABEND) | S3.RUN THEN` follows steps S1, S2 and S3
- **THEN** no diagnostics are reported

#### Scenario: Condition continued
- **WHEN** an IF condition is split across two lines, the second starting `//` and a blank, and ends with `THEN`
- **THEN** it is read as one condition and no diagnostics are reported

### Requirement: Condition errors
A condition that breaks the syntax SHALL get a `JCLC` error at the column of the bad part: `JCLC001` for a missing operand, unknown operator, unbalanced brackets or unexpected word; `JCLC006` when `THEN` is missing. None SHALL crash.

#### Scenario: Missing THEN
- **WHEN** `// IF RC = 0` has no `THEN`
- **THEN** `JCLC006` is reported

#### Scenario: Unknown operator
- **WHEN** `// IF RC => 4 THEN` is checked
- **THEN** `JCLC001` is reported at the column of `=>`

#### Scenario: Unbalanced brackets
- **WHEN** `// IF (RC = 0 THEN` is checked
- **THEN** `JCLC001` is reported

### Requirement: Condition values
`RC` SHALL be compared with a whole number from 0 to 4095 (`JCLC002` otherwise). `ABENDCC` SHALL take `Sxxx` with three hex digits or `Unnnn` from 0000 to 4095 (`JCLC003` otherwise).

#### Scenario: RC limits
- **WHEN** `RC = 4095` and `RC = 4096` are checked
- **THEN** the first is accepted and the second gets `JCLC002` at the value

#### Scenario: ABENDCC values
- **WHEN** `ABENDCC=S0C4`, `ABENDCC=U4095`, `ABENDCC=S0C` and `ABENDCC=U4096` are checked
- **THEN** the first two are accepted and the last two get `JCLC003`

### Requirement: Step references in conditions
A step named in a condition SHALL be an earlier step in the same job or PROC, or `JCLC004` SHALL name it. A `step.procstep` reference SHALL name a step of the in-stream PROC that step calls, or `JCLC005` SHALL name it; calls to PROCs that can't be seen are not checked.

#### Scenario: Later step
- **WHEN** a condition names a step that comes after the IF
- **THEN** `JCLC004` names that step

#### Scenario: Typo in a step name
- **WHEN** a clean-up job's condition names `MIAN` instead of `MAIN`
- **THEN** `JCLC004` names `MIAN`

#### Scenario: Clean-up step on failure
- **WHEN** `// IF (MAIN.ABEND | MAIN.RC > 4) THEN` follows step MAIN, with a clean-up step and `// ENDIF`
- **THEN** no diagnostics are reported

#### Scenario: Unknown procedure step
- **WHEN** `RUN1.NOPE.RC = 0` names a step RUN1 that calls an in-stream PROC without a step NOPE
- **THEN** `JCLC005` is reported

### Requirement: IF branches
Each IF SHALL record the steps in its THEN branch and its ELSE branch, including steps of nested IFs. An IF SHALL have at most one ELSE (`JCLC007` on the second). IFs SHALL nest at most 15 deep (`JCLC008` on the 16th).

#### Scenario: THEN branch
- **WHEN** `// IF (STEP1.RC = 0) THEN` is followed by steps STEP2 and STEP3 and `// ENDIF`
- **THEN** the IF's THEN branch holds STEP2 and STEP3

#### Scenario: THEN and ELSE
- **WHEN** an IF has STEP2 before `// ELSE` and STEP3 after it
- **THEN** STEP2 is in the THEN branch and STEP3 in the ELSE branch

#### Scenario: Second ELSE
- **WHEN** an IF has two ELSE statements
- **THEN** `JCLC007` is reported on the second

#### Scenario: Nesting limit
- **WHEN** IFs are nested 15 deep, and another set 16 deep
- **THEN** the first is accepted and the second gets `JCLC008`
