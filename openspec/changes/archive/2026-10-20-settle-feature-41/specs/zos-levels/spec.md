# Spec Delta

## ADDED Requirements

### Requirement: Keyword level marks
Keywords that appeared or were removed within the supported levels SHALL carry `since` or `until` marks, each citing the JCL Reference, so `JCLK005` reports them at other levels.

#### Scenario: Marked keyword
- **WHEN** a keyword marked `since` a level is used at an earlier supported level
- **THEN** `JCLK005` is reported
