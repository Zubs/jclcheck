# Spec Delta

## Purpose

Lets workbench users choose the z/OS level and JES their JCL is checked against, remembers the choice, and shows what each result was checked against.

## ADDED Requirements

### Requirement: Level and JES choice
The workbench header SHALL offer the levels from `GET /api/levels` and a JES2/JES3 choice, with JES3 offered only at levels that allow it. Each check SHALL send the chosen `zosLevel` and `jes`, and changing either SHALL check again straight away.

#### Scenario: First visit
- **WHEN** a user opens the workbench with nothing stored and no address options
- **THEN** the newest level and JES2 are selected

#### Scenario: Choosing 2.3
- **WHEN** the user picks z/OS 2.3 with Nick's item 10 in the editor
- **THEN** the JCL is checked again at 2.3 and is clean

#### Scenario: Oldest and newest
- **WHEN** the user picks the oldest and then the newest level
- **THEN** each is sent and gives a result

#### Scenario: JES3 at 2.5 and 3.1
- **WHEN** the user picks JES3 at 2.5 and then picks 3.1
- **THEN** JES3 is checked at 2.5, then JES2 is selected with a notice that IBM removed JES3 in z/OS 3.1, and JES3 can't be picked at 3.1

### Requirement: Remembered choice
The choice SHALL be saved in browser storage and kept in the address (`?zos=&jes=`), without counting a new page view. The address SHALL win over storage. An unknown level or JES3 at a 3.x level in the address SHALL fall back, with a short notice. Blocked storage SHALL NOT stop the picker working.

#### Scenario: Shared address
- **WHEN** the workbench opens at `/app?zos=2.5&jes=JES3`
- **THEN** z/OS 2.5 and JES3 are selected and used

#### Scenario: Unknown level in the address
- **WHEN** the workbench opens at `/app?zos=9.9`
- **THEN** the newest level is selected and a notice says 9.9 isn't supported

#### Scenario: Blocked storage
- **WHEN** browser storage throws on every access
- **THEN** the picker still works for the visit

### Requirement: Checked-against label
The diagnostics panel SHALL show the level and JES the result was checked against, from the API response.

#### Scenario: Label matches the choice
- **WHEN** a check at z/OS 2.4 with JES2 returns
- **THEN** the panel shows `Z/OS 2.4 · JES2`
