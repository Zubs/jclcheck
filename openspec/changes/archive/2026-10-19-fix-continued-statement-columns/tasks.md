# Tasks

## 1. Columns

- [x] 1.1 Add `statementText` and `continuationMark` to `lexer.js` and use `statementText` for field splitting, continuation lines, the null statement and the in-stream delimiter; verify `test/lexer-columns.test.js`: a blank column 72 reads as before; a character in column 71 is in the operand; an 80-character line with `00010000` in 73–80 has no diagnostics; a card-image job with sequence numbers on every line (including `/*` and `//`) is clean; data in columns 73–80 stays in `instreamData`

## 2. Continued comments

- [x] 2.1 Add `JCLL004` to the catalog and consume continued comment lines after a complete operand when column 72 is marked; verify tests: one comment line gives one statement with both comment parts; a continued operand with a marked column 72 still continues; a marked line followed by a new statement gives `JCLL004` at column 72 and the new statement is still read; a mark on the last line gives `JCLL004`; Nick's item 2 has one EXEC over lines 2–6 and no `JCLP002`
- [x] 2.2 Update fixtures: move `nick/02-continued-comment`'s `todo` to feature 18 (COND.stepname keywords) and add `JCLL004` (error, line 9, column 72) to `broken.expected.json`; verify `npm test` passes
- [x] 2.3 Update the lexer's header comment and add the column rules to `HelpModal.vue`; verify frontend tests and lint pass

## 3. Checks and progress

- [x] 3.1 Run lint, tests and the build in both packages; verify all pass
- [x] 3.2 Tick feature 4 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
