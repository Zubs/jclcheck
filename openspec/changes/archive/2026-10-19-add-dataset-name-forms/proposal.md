# Proposal

## Why

`DSN=NICK.BECKER(MYJOB)` is a normal PDS member reference, but the member is counted as part of the last qualifier, so it gets a false "qualifier longer than 8 characters" warning (Nick's item 13). Temporary names (`&&TEMP`) are skipped as if they were symbols, and quoted names are checked as if they were ordinary ones.

## What Changes

- `checkDsn` separates a trailing bracketed part before checking qualifiers:
  - a member, 1–8 characters starting with a letter or `$ # @` — otherwise the new warning `JCLS010`, naming the member and the rule;
  - a generation (`(0)`, `(+n)`, `(-n)`), as today.
- The 44-character limit applies to the name without the member or generation.
- Temporary datasets (`&&TEMP`, `&&TEMP(MEM)`) are checked by the temporary-name rule (1–8 characters after `&&`, starting with a letter or `$ # @`), with `JCLS006` otherwise.
- A quoted name (`DSN='ODD.NAME'`) skips the qualifier checks and gets an info note, `JCLS014`.
- Nick's item 13 fixture loses its `todo`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `dd-statement-rules`: adds dataset name forms.

## Impact

- `backend/src/rules/paramRules.js`, `errors.js`; Features.md (feature 19, feature 30's code list).
