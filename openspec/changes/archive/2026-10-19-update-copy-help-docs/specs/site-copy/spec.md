# Spec Delta

## Purpose

Keeps what the site, the in-app help and the documentation say about JCLcheck true to what it does, including where JCL goes and what every diagnostic code means.

## ADDED Requirements

### Requirement: Honest about where JCL goes
No page or document SHALL say the check runs only in the browser. The FAQ, About page and landing page SHALL say JCL is sent to the JCLcheck API and not stored there; privacy copy SHALL say the draft stays in the user's browser and a shared link carries the JCL itself.

#### Scenario: No browser-only claim
- **WHEN** the site's source and pages are searched for claims that checking happens in the browser
- **THEN** none is found

#### Scenario: FAQ structured data
- **WHEN** the landing page's FAQ structured data is built
- **THEN** it matches the visible FAQ text

### Requirement: Help explains levels and every code
Help SHALL name the supported z/OS levels and the default, say JES3 is only checked at 2.5 and earlier, and list every diagnostic code with a description. The list SHALL contain exactly the codes in the backend catalog.

#### Scenario: Default level
- **WHEN** help is opened
- **THEN** it names z/OS 3.2 as the default

#### Scenario: Codes in step
- **WHEN** the help code list is compared with the backend catalog
- **THEN** every catalog code is in help and help lists no other code

### Requirement: README example matches the API
The README's example request and response SHALL match what the API returns for that request.

#### Scenario: Example request
- **WHEN** the README example request is sent to the validator
- **THEN** its diagnostics, stats, zosLevel and jes equal the README example response
