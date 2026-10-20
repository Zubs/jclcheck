# Spec Delta

## ADDED Requirements

### Requirement: Levels endpoint
`GET /api/levels` SHALL return every supported level, oldest first, each with whether JES3 can be chosen at it, and the default level and JES.

#### Scenario: Listing levels
- **WHEN** `GET /api/levels` is requested
- **THEN** the response lists 2.3, 2.4, 2.5, 3.1 and 3.2 with `jes3` true up to 2.5 and false after, and gives `defaultLevel: "3.2"` and `defaultJes: "JES2"`
