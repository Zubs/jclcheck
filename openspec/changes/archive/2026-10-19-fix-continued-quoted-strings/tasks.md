# Tasks

## 1. Continued quoted strings

- [x] 1.1 Give `splitOperandAndComment` a starting quote state, and in the continuation loop pad an open-quote line to column 71 and join the next line from its first text column; add `JCLL005` and report it when that column isn't 16 (columns 3–15 not all blank); verify `test/lexer-quotes.test.js`: a one-line quote is unchanged; item 3 is clean with the full sentence; three lines join in order; ending at column 71 adds no blanks, at column 60 adds 11; column 15 and 17 give `JCLL005` at that column on the continuation line; text after the closing quote is a further parameter and the comment is separate
- [x] 1.2 Join a split doubled quote (closing quote in column 71, `'` in column 16); verify a test gives one statement with `IT''S FINE` and no diagnostics
- [x] 1.3 Stop `unbalancedParenCheck` reporting an open quote as `JCLP003`; verify a never-closed continued string gets `JCLL003` on its last line and no `JCLP003`, and unbalanced parentheses still get `JCLP003`
- [x] 1.4 Remove the `todo` from `nick/03-continued-quote.expected.json`; verify it passes

## 2. Docs and progress

- [x] 2.1 In Features.md, rename feature 5's diagnostic to `JCLL005` and add the split doubled-quote question to feature 41; verify both read correctly
- [x] 2.2 Run lint, tests and the build in both packages; verify all pass
- [x] 2.3 Tick feature 5 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
