# Proposal

## Why

JES3 shops (z/OS 2.5 and earlier) put JES3 control statements such as `//*MAIN` and `//*FORMAT` in their jobs. Today these are silently treated as comments, so mistakes in them go unnoticed, and `//*DATASET` data lines are reported as malformed lines.

## What Changes

- New optional request field `jes`: `"JES2"` (default) or `"JES3"`. JES3 at z/OS 3.1 or later gets a 400 response explaining JES3 was removed in 3.1. The response includes `jes`.
- With JES3: `//*NAME ` for a known JES3 statement is a JES3 statement; other `//*` lines stay comments; `//**` lines are JES3 commands; lines between `//*DATASET` and `//*ENDDATASET` are data.
- A JES3 statement table in `keywords.js` (`until: '2.5'`): `DATASET`, `ENDDATASET`, `FORMAT`, `MAIN`, `NET`, `NETACCT`, `OPERATOR`, `PAUSE`, `PROCESS`, `ENDPROCESS`, `ROUTE`, with the keywords of `MAIN`, `FORMAT`, `NET`, `NETACCT` and `DATASET`. `/*SIGNON` and `/*SIGNOFF` remain valid with JES3.
- New warnings (info where noted), `JCLJ3xx`:
  - `JCLJ301` misspelt JES3 statement ("Did you mean 'MAIN'?"), `JCLJ302` unknown keyword on a JES3 statement, `JCLJ303` placement, `JCLJ304` `//*DATASET` without `//*ENDDATASET`, `JCLJ305` a JES2 statement while checking for JES3, `JCLJ306` (info) a JES3-looking line while checking for JES2.
- Keyword values are checked by feature 14's value rules, which aren't built yet; Features.md feature 14 gains a note to cover JES3 values.
- Direct API use records `api/jes/<JES2|JES3>`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `jes-control-statements`: adds JES3 statements and the `jes` option.

## Impact

- Backend: `lexer.js`, `keywords.js`, `errors.js`, `validator.js`, `rules/jesRules.js`, `index.js`.
- API: new optional `jes` in request and response.
- Docs: Spec.md API row, Help dialog, Features.md features 14 and 41.
