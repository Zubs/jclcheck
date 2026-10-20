# Proposal

## Why

JES2 control statements (`/*ROUTE`, `/*JOBPARM`, …) don't start with `//`, so every one gets `JCLL001` ("does not begin with //"). Real production jobs use them all the time (Nick's item 8).

## What Changes

- Outside in-stream data, a line starting `/*` followed straight away by a letter, or by `$` (a JES2 command), is a JES2 control statement, not an error.
- A table of known JES2 statements in `keywords.js`: `JOBPARM`, `MESSAGE`, `NETACCT`, `NOTIFY`, `OUTPUT`, `PRIORITY`, `ROUTE`, `SETUP`, `SIGNOFF`, `SIGNON`, `XEQ`, `XMIT`.
- New `JCLJ` code group, warnings by default (shops have exits and local extensions):
  - `JCLJ001`: unknown JES2 statement, with "Did you mean".
  - `JCLJ002`: `/*ROUTE` must start with `PRINT`, `PUNCH` or `XEQ`, followed by a destination.
  - `JCLJ003`: placement — `/*PRIORITY` goes before the JOB statement, the others after it.
- Nick's item 8 fixture loses its `todo`.
- The Help dialog lists the `JCLJ` group.

## Capabilities

### New Capabilities
- `jes-control-statements`: recognising and checking JES2 (and later JES3) control statements.

### Modified Capabilities

## Impact

- `backend/src/lexer.js`, `keywords.js`, `errors.js`, `validator.js`, new `rules/jesRules.js`; `frontend/src/components/HelpModal.vue`.
