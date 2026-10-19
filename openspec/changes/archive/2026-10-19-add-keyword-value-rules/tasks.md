# Tasks

## 1. Rule engine

- [x] 1.1 Write `valueRules.js` (rule types, `checkValue`, `closest`) and move `levenshtein`/closest matching there; verify `test/value-rules.test.js` covers each rule type, including `list` positions with labels, omitted positions, too many entries, and `oneOf`

## 2. Rules on keywords

- [x] 2.1 Add `JCLS009`, the first set of rules as table marks, and the lookup in `checkParamValues` (skipping `&` and `*.` values); verify tests: a keyword with no rule accepts anything; `TYPRUN=SCAN` passes and `SCAM` gets "Did you mean 'SCAN'?"; five bad JOB values give five warnings at their own columns; PRTY 0/15 pass and -1/16 fail; `CLASS=A` passes, `CLASS=AB` fails at the value column with the allowed values in the message; `CLASS=` gets `JCLS009`; `CLASS=&MYCLASS` in a PROC gets nothing; the full suite is unchanged
- [x] 2.2 Add the JES3 `MAIN` `HOLD`/`FAILURE` rules and check them in `jesRules`; verify `//*MAIN HOLD=MAYBE` gets `JCLS009` at the value

## 3. Docs and progress

- [x] 3.1 Note in Features.md feature 14 that the hand-written checks keep their codes; verify the text
- [x] 3.2 Run lint, tests and the build in both packages; verify all pass
- [x] 3.3 Tick feature 14 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
