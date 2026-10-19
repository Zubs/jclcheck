# Tasks

## 1. Condition parsing

- [x] 1.1 Write `backend/src/conditions.js` (tokenizer and parser returning refs and errors) and add `JCLC001`–`JCLC006` to the catalog; verify `test/conditions.test.js`: `(STEP1.RC = 0) THEN` and `(S1.RC = 0 & ¬S2.ABEND) | S3.RUN THEN` parse with the right refs; `RC = 4095` passes and `4096` gets `JCLC002` at the value; `ABENDCC=S0C4`/`U4095` pass and `S0C`/`U4096` get `JCLC003`; missing THEN gets `JCLC006`; `RC => 4` gets `JCLC001` at `=>`; `(RC = 0 THEN` gets `JCLC001`
- [x] 1.2 Continue IF statements in the lexer until `THEN`, and rebuild the condition with line/column per character in the parser; verify a two-line condition is clean and an error on the second line points at that line

## 2. Branches and references

- [x] 2.1 Attach IFs to their container as `ifs` with `thenBranch`/`elseBranch` step lists, `earlierSteps`, second-ELSE `JCLC007` and nesting `JCLC008`; verify tests: THEN branch holds STEP2 and STEP3; ELSE split is right; second ELSE gets `JCLC007`; 15 levels pass and 16 get `JCLC008`
- [x] 2.2 Add `rules/ifRules.js` (after PROC resolution) for `JCLC004`/`JCLC005`; verify: a later step and a typo get `JCLC004` naming the step; the clean-up job is clean; an unknown procstep gets `JCLC005`; a job without IFs is unchanged (full suite passes)

## 3. Docs and progress

- [x] 3.1 Add the `JCLC` group to the Help dialog and the README code list, and note that `^`/`!` aren't accepted for `¬` in Features.md feature 41; verify frontend tests and lint pass
- [x] 3.2 Run lint, tests and the build in both packages; verify all pass
- [x] 3.3 Tick feature 13 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
