# Tasks

## 1. Delimiters

- [x] 1.1 Add `DLM` to `DD_KEYWORDS`, add `parseDelimiter`, and rework the lexer's in-stream handling: per-DD delimiter and kind, end rules for `DLM=`, `DD *` and `DD DATA`, and `JCLL006` when required data hits end of file; remove the placeholder assignment; verify `test/instream.test.js`: `DD *` then `/*` is empty and clean; item 15 is clean with two data lines; ` @@` is data; two DDs with `@@` and `$$` end at their own; a `/*` line under `DLM=$$` is not a statement and gets no `JCLL001`; `/* END` ends default data; `DD DATA` keeps a `//` line; a SORT card with `/*` under `DLM=$$` is clean; missing `@@` gives one `JCLL006` naming it; `DD *` at end of file gives none
- [x] 1.2 Report `JCLS011` for invalid `DLM=` values and `JCLK006` for `DLM=` without in-stream data in `ddRules`; verify tests: `@@`, `$$`, `'%%'` accepted; `@`, `@@@` and empty rejected at the value column; `DLM=` on a `DSN=` DD gets `JCLK006` at the keyword
- [x] 1.3 Remove the `todo` from `nick/15-dlm.expected.json` (and from `nick/14a-dd-data-jcl` if it now passes); verify `npm test` passes

## 2. Docs and progress

- [x] 2.1 Record `JCLS011`, `JCLL006` and `JCLK006` in Features.md feature 6 and feature 30's code list; verify the text matches
- [x] 2.2 Run lint, tests and the build in both packages; verify all pass
- [x] 2.3 Tick feature 6 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
