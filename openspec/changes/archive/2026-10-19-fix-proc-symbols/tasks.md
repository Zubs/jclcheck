# Tasks

## 1. Symbols

- [x] 1.1 Add `SYSTEM_SYMBOLS` to `keywords.js`, keep SET symbols on their job in the parser, skip `&&name` in the symbol scan, and check symbols per call (defaults, earlier SETs, EXEC overrides, system symbols) with `JCLR002` naming the calling step at the symbol's column; keep the defaults-only check for uncalled PROCs; verify `test/proc-symbols.test.js`: no symbols, `&&WORK`, the feature example clean, called twice gives one `JCLR002` naming the second step, SET before/after, stray `&&` and trailing `&` don't crash
- [x] 1.2 Accept a PROC's body symbols as keywords on the calling EXEC and reword `JCLK001` for calling steps; verify `ENV=TEST` with no default is clean and `XYZ=1` gets the new wording; the samples and fixtures still pass

## 2. Checks and progress

- [x] 2.1 Run lint, tests and the build in both packages; verify all pass
- [x] 2.2 Tick feature 32 in the Features.md Progress list; verify the box is ticked

## Workflow follow-up

- Archive the change and sync its specs.
