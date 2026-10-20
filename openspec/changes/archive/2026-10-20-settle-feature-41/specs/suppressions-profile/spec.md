# Spec Delta

## ADDED Requirements

### Requirement: Profile form
The PROFILE panel SHALL edit the profile with a form (name patterns, allowed values, prefixes, extra keywords, severities), with the JSON as an advanced view; both SHALL edit the same profile.

#### Scenario: Form to JSON
- **WHEN** the user types `AR*` as the job name pattern in the form
- **THEN** the JSON view shows `"names": { "job": ["AR*"] }` and the check uses it
