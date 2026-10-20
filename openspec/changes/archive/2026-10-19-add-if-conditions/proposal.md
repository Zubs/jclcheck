# Proposal

## Why

Only the IF/ENDIF balance is checked today. A bad condition (`RC => 4`), an out-of-range return code, a missing `THEN`, or a reference to a step that doesn't exist (a typo in the step name) all go unnoticed, and the AST doesn't say which steps an IF controls.

## What Changes

- The IF condition (from after `IF` up to `THEN`, across continuation lines) is parsed: `RC`, `ABEND`, `¬ABEND`, `ABENDCC`, `RUN`, `¬RUN`, each optionally qualified as `step.` or `step.procstep.`; the operators `GT GE LT LE EQ NE` and `> >= < <= = ¬=`; `NOT`/`¬`, `AND`/`&`, `OR`/`|` and brackets; and a closing `THEN`.
- Values: `RC` compares with a whole number 0–4095; `ABENDCC` takes `Sxxx` (three hex digits) or `Unnnn` (0000–4095); `ABEND` and `RUN` may be compared with `TRUE` or `FALSE`.
- A step reference must name an earlier step in the same job (or PROC); a `step.procstep` reference must name a step of the in-stream PROC that step calls.
- An IF statement whose condition isn't finished on its line continues onto following `//` lines with a blank column 3 until `THEN`.
- IF nodes are kept on their job (or PROC) as `ifs`, each with `thenBranch` and `elseBranch` listing the steps inside it (nested steps count for every enclosing IF). Steps stay in `job.steps` too.
- At most one ELSE per IF, and at most 15 levels of nesting (feature 41 asks to confirm 15).
- New error group `JCLCxxx`: `JCLC001` condition syntax (missing operand, unknown operator, unbalanced brackets, unexpected word), `JCLC002` RC value, `JCLC003` ABENDCC value, `JCLC004` step not earlier in the job, `JCLC005` procstep not in the PROC, `JCLC006` missing THEN, `JCLC007` second ELSE, `JCLC008` nesting too deep. Each points at the bad part of the condition.

## Capabilities

### New Capabilities

### Modified Capabilities
- `job-structure`: adds IF/THEN/ELSE conditions and branches.

## Impact

- Backend: `lexer.js` (IF continuation), `parser.js`, `ast.js`, new `conditions.js` (tokenizer and parser) and `rules/ifRules.js`, `errors.js`, `validator.js`.
- Frontend: Help dialog lists the `JCLC` group.
