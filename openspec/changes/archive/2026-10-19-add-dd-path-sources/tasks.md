# Tasks

## 1. Keywords and rules

- [x] 1.1 Add `each` and `path` rule types and the PATH, PATHOPTS, PATHMODE, PATHDISP and FILEDATA keywords with rules; verify `test/dd-path.test.js`: item 19 is clean; all keywords together are clean; 255 passes, 256 and `pay.time` get `JCLS009`; a BPXBATCH job is clean

## 2. Data sources and conflicts

- [x] 2.1 Count PATH, SUBSYS, DDNAME and SPACE-only temporary datasets as sources, add PATH to the conflicting sources, and add `JCLD005`–`JCLD007`; verify tests: PATH+DSN gets `JCLD003`; two access modes get `JCLD005`; PATHOPTS without PATH gets `JCLD007`; DISP with PATH gets `JCLD006`; the three valid DDs get no `JCLD002`; `DISP=SHR` alone still gets `JCLD002`
- [x] 2.2 Remove the `todo` from `nick/19-path.expected.json`; verify it passes

## 3. Docs and progress

- [x] 3.1 Add `JCLD005`–`JCLD007` to feature 30's code list in Features.md; verify the text
- [x] 3.2 Run lint, tests and the build in both packages; verify all pass
- [x] 3.3 Tick feature 21 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
