# Spec Delta

## ADDED Requirements

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
