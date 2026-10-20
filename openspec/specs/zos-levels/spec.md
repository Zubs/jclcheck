# zos-levels Specification

## Purpose

Lets callers choose the z/OS release that JCL is checked against, so keywords and statements are accepted or explained according to that release, and every result says which release it followed.

## Requirements

### Requirement: Supported z/OS levels
The validator SHALL support the z/OS levels 2.3, 2.4, 2.5, 3.1 and 3.2. When no level is given, the newest supported level SHALL be used.

#### Scenario: No level given
- **WHEN** JCL is checked without a z/OS level
- **THEN** it is checked against z/OS 3.2, and the result says `zosLevel: "3.2"`

#### Scenario: Level given
- **WHEN** JCL is checked with `zosLevel: "2.4"`
- **THEN** it is checked against z/OS 2.4, and the result says `zosLevel: "2.4"`

### Requirement: Level-dependent keywords and statements
A keyword or statement type MAY be marked as available from a level (`since`) or up to and including a level (`until`). One without either mark SHALL be available at every supported level. One marked `since` a level SHALL be available at that level and later. One marked `until` a level SHALL be available at that level and earlier.

#### Scenario: EMAIL on the JOB statement at z/OS 2.3
- **WHEN** `//RARE JOB MSGLEVEL=(1,1),EMAIL='nick-becker@themagicmainframe.com'` followed by `//STEP1 EXEC PGM=IEFBR14` is checked at z/OS 2.3
- **THEN** no diagnostics are reported

#### Scenario: Nick's item 10 at the default level
- **WHEN** Nick's item 10 example is checked without a level
- **THEN** no diagnostics are reported

#### Scenario: Keyword at the oldest level
- **WHEN** a keyword marked `since` the oldest supported level is used at that level
- **THEN** no level diagnostic is reported

#### Scenario: Keyword one level too early
- **WHEN** a keyword marked `since: '2.4'` is used at z/OS 2.3
- **THEN** a `JCLK005` warning is reported at the keyword's line and column

#### Scenario: Removed entry at its last level
- **WHEN** an entry marked `until: '2.5'` is used at z/OS 2.5
- **THEN** no level diagnostic is reported

#### Scenario: Removed entry after its last level
- **WHEN** an entry marked `until: '2.5'` is used at z/OS 3.1
- **THEN** a `JCLK005` warning says it was removed after z/OS 2.5

#### Scenario: Two levels differ only by level-marked keywords
- **WHEN** the same JCL is checked at two levels
- **THEN** the diagnostics differ only by `JCLK005` warnings for keywords whose `since` or `until` falls between the two levels

### Requirement: Level diagnostic
`JCLK005` SHALL be a warning. Its message SHALL name the keyword or statement, the statement type, the level it arrived in or was last available at, and the level being checked. Its suggestion SHALL say to choose a level where it is available, or to remove it.

#### Scenario: JCLK005 wording for a keyword that arrived later
- **WHEN** `EMAIL=` on a JOB statement is checked at a level before it arrived
- **THEN** the message reads like "'EMAIL' on the JOB statement is available from z/OS 2.3. You are checking against z/OS 2.2.", with the levels filled in, and the suggestion names a newer level

### Requirement: Misspelt keywords stay unknown
A keyword that isn't known at any level SHALL be reported with `JCLK001`, including its "Did you mean" suggestion, and SHALL NOT be reported with `JCLK005`.

#### Scenario: EMAILL on the JOB statement
- **WHEN** `//J JOB EMAILL='a@b.com'` is checked at any level
- **THEN** `JCLK001` is reported with the suggestion "Did you mean 'EMAIL'?", and no `JCLK005`

### Requirement: Level in the API
`POST /api/validate` SHALL accept an optional string field `zosLevel`. Its response SHALL include `zosLevel`, the level used, next to `diagnostics`, `ast` and `stats`.

#### Scenario: Response names the level
- **WHEN** a request to `/api/validate` has no `zosLevel`
- **THEN** the response's `zosLevel` is `"3.2"`, next to `diagnostics`, `ast` and `stats`

#### Scenario: Level asked for
- **WHEN** a request has `"zosLevel": "2.3"`
- **THEN** the JCL is checked at z/OS 2.3 and the response's `zosLevel` is `"2.3"`

### Requirement: Unknown level rejected
A request whose `zosLevel` isn't a supported level SHALL get a 400 response whose message lists the supported levels, and the JCL SHALL NOT be validated.

#### Scenario: Unknown level
- **WHEN** a request has `"zosLevel": "9.9"`, `"abc"` or a number such as `3.1`
- **THEN** the response is 400, its message lists 2.3, 2.4, 2.5, 3.1 and 3.2, and it has no `diagnostics`

### Requirement: Level counted for direct API use
When the backend counts a direct (non-workbench) request to `/api/validate` that was validated, it SHALL also record the level used as `api/level/<level>`.

#### Scenario: Direct request at a level
- **WHEN** a direct request with `"zosLevel": "2.5"` is validated and analytics is on
- **THEN** `api/level/2.5` is recorded with the other direct-use hits

#### Scenario: Rejected level isn't counted as a level
- **WHEN** a direct request has `"zosLevel": "9.9"`
- **THEN** `api/result/bad-request` is recorded and no `api/level/` hit is

### Requirement: Levels endpoint
`GET /api/levels` SHALL return every supported level, oldest first, each with whether JES3 can be chosen at it, and the default level and JES.

#### Scenario: Listing levels
- **WHEN** `GET /api/levels` is requested
- **THEN** the response lists 2.3, 2.4, 2.5, 3.1 and 3.2 with `jes3` true up to 2.5 and false after, and gives `defaultLevel: "3.2"` and `defaultJes: "JES2"`

### Requirement: Keyword level marks
Keywords that appeared or were removed within the supported levels SHALL carry `since` or `until` marks, each citing the JCL Reference, so `JCLK005` reports them at other levels.

#### Scenario: Marked keyword
- **WHEN** a keyword marked `since` a level is used at an earlier supported level
- **THEN** `JCLK005` is reported
