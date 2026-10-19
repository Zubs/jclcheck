# Tasks

## 1. Help

- [x] 1.1 Add `frontend/src/diagnosticCodes.js` (every code with a one-line description, grouped) and render it in `HelpModal.vue` with the levels, JES3 note and default level; verify `tests/components/HelpModal.test.js`: help names z/OS 3.2 as default; every code from `backend/src/errors.js` appears and no extra code is listed

## 2. Site copy

- [x] 2.1 Fix the FAQ (where checking happens, what is validated, privacy with drafts and links), the About page and the landing trust line; verify a test that no file in `src/` claims checks run in the browser, and the existing FAQ structured-data test still passes

## 3. Docs

- [x] 3.1 Update README ("What's validated", API with an example request/response, limitations) and add `backend/test/readme.test.js` that runs the README example through `validate()` and compares; verify it passes
- [x] 3.2 Update Spec.md (privacy, workbench features, what is checked, code groups, known limits) and add the About "Thanks" question to Features.md feature 41; verify the text

## 4. Checks and progress

- [x] 4.1 Run lint, tests and the build in both packages; verify all pass
- [x] 4.2 Tick feature 30 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
