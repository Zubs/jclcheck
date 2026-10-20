# Design

## Context

In `lexer.js` the continuation loop strips `//` and leading blanks from each continuation line and calls `splitOperandAndComment` on it from a fresh quote state. `paramTokenizer.unbalancedParenCheck` reports `JCLP003` when parentheses are unbalanced or a quote is left open.

## Decisions

1. **Carry the quote state.** `splitOperandAndComment(rest, inQuote = false)` takes the starting state. When the joined operand so far ends inside a quote (`cont.openQuote`), the lexer pads the operand with `71 - statementText(prev).length` blanks, takes the continuation line's text from its first non-blank column after column 2 (so a wrong column is still joined), and splits it starting in-quote. Otherwise the existing behaviour (strip leading blanks) stays.

2. **`JCLL005`, not `JCLL004`.** Feature 4 already uses `JCLL004` for an unfollowed column-72 mark. Features.md feature 5 is updated to the new code.

3. **Split doubled quote heuristic.** After an operand that ends with a closing quote exactly in column 71, if the next line has blanks in columns 3–15 and `'` in column 16, the lexer joins it as a quote continuation (no padding, since column 71 is filled). The JCL Reference doesn't spell this case out, so it's added to Features.md feature 41 to confirm on a real system.

4. **One diagnostic for an open quote.** `unbalancedParenCheck` stops counting an unclosed quote as a parenthesis problem; the lexer already reports `JCLL003`, which is the accurate message. Unbalanced parentheses still get `JCLP003`.

## Risks / Trade-offs

- [The doubled-quote heuristic could join a line that z/OS would treat as a new statement] → Only when column 71 closes a string and column 16 opens with a quote, which is otherwise a syntax error anyway.
