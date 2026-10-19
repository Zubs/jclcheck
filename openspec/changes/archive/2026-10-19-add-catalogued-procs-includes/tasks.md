# Tasks

## 1. Backend library

- [x] 1.1 Write `library.js` (line ranges, `findMember`, mapping diagnostics back) and add `JCLR005`–`JCLR008`; update `JCLR001`'s fix to mention the Library panel
- [x] 1.2 Expand INCLUDE members before parsing (search order, nesting, loops, forbidden statements); verify `test/library.test.js`: nested includes check as if in place; 15 levels pass and 16 get `JCLR007`; a self-include gets one `JCLR006`; a JOB in a member gets `JCLR008` with `member`; a missing member gets `JCLR005`; a mistake on line 3 of an included member reports `member` and line 3
- [x] 1.3 Resolve catalogued PROCs through the library in `resolveProcCalls` and check them; verify: an empty library keeps `JCLR001`; MYPROC2 in the library removes `JCLR001` and its mistake carries `member` and its own line; the first JCLLIB library wins; Nick's item 17 with the JCLLIB moved and MYPROC2 supplied has no `JCLR001`
- [x] 1.4 Accept and check `library` in `POST /api/validate`; verify `test/api.test.js`: 50 entries pass, 51 get 400; an entry with member `1BAD` gets 400 naming it
- [x] 1.5 Document `library` and `member` in Spec.md's API row and README; verify the text

## 2. Workbench Library panel

- [x] 2.1 Send `library` from `api.js`, add `LibraryPanel.vue` and the header toggle in `Workbench.vue`, re-check on library changes, and count `library/add` and `library/remove`; verify `tests/components/LibraryPanel.test.js` and Workbench tests: adding a member and typing sends it; removing stops sending it; both are counted
- [x] 2.2 Show member diagnostics as `MYPROC2 L3:5` in `ErrorPanel` and open the panel at that member and line on click; keep member diagnostics off the main editor's gutter; verify tests for the label and the click
- [x] 2.3 Extend `tests/privacy.test.js` with a marker in a library member; verify it is never passed to analytics
- [x] 2.4 Describe the Library panel in the Help dialog; verify frontend tests and lint pass

## 3. Checks and progress

- [x] 3.1 Run lint, tests and the build in both packages; verify all pass
- [x] 3.2 Tick feature 23 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
