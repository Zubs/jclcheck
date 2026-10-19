# Proposal

## Why

z/OS UNIX files are named on DD statements with `PATH=` and its companion keywords, which all get `JCLK001` today (Nick's item 19). Separately, `JCLD002` (missing data source) is wrongly reported on valid DDs: a new temporary dataset with only `SPACE=`, `SUBSYS=` and `DDNAME=`.

## What Changes

- New DD keywords with value rules:
  - `PATH`: an absolute path (starting with `/`) of up to 255 characters, quoted or not.
  - `PATHOPTS`: one or more of ORDONLY, OWRONLY, ORDWR, OAPPEND, OCREAT, OEXCL, ONOCTTY, ONONBLOCK, OSYNC, OTRUNC.
  - `PATHMODE`: one or more of the permission names (SIRUSR, SIWUSR, SIXUSR, SIRWXU, the GRP and OTH forms, SISUID, SISGID, SISVTX).
  - `PATHDISP`: up to two of KEEP and DELETE.
  - `FILEDATA`: BINARY, TEXT or RECORD.
- A new `each` rule type (every item of a list follows one rule) and a `path` rule type.
- `PATH`, `SUBSYS` and `DDNAME` count as data sources; a DD with `SPACE=` and no DSN counts as a new temporary dataset.
- Conflicts: `PATH` with `DSN`, `SYSOUT` or `DUMMY` (`JCLD003`); `DISP` with `PATH` (`JCLD006`, use PATHDISP); more than one of ORDONLY, OWRONLY, ORDWR (`JCLD005`); path options without `PATH` (`JCLD007`, warning).
- Nick's item 19 fixture loses its `todo`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `dd-statement-rules`: UNIX file DDs and data-source rules.

## Impact

- `backend/src/keywords.js`, `valueRules.js`, `rules/ddRules.js`, `errors.js`; Features.md feature 30's code list.
