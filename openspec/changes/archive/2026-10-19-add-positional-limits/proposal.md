# Proposal

## Why

`//CLEAN JOB ,,,,,,,,,,,,,,,MSGLEVEL=(1,1)` (Nick's item 16) checks clean, but the JOB statement allows only two positional parameters (accounting information and programmer's name). Empty positionals are dropped by the tokenizer, so they can't even be counted.

## What Changes

- The tokenizer keeps empty positional parameters (`,,`) before the first keyword, marked `empty`, so they can be counted. Existing checks ignore empty entries.
- `keywords.js` sets the positional limit per statement: JOB 2, EXEC 1, DD 1.
- New error `JCLK004` at the first positional over the limit, naming the statement, the limit and the number found. Reported once per statement.
- Size and form of the JOB positionals:
  - `JCLS012` (warning): accounting information over 143 characters, or a programmer's name over 20.
  - `JCLS013` (warning): a programmer's name with special characters that isn't quoted.
- A positional after a keyword still gets `JCLK003`.
- Nick's item 16 fixture loses its `todo`; its column becomes 15 (the first extra positional) instead of the estimated 13. Features.md's "found 16" becomes "found 15" (the example has 15 commas).

## Capabilities

### New Capabilities
- `statement-parameters`: rules for the positional and keyword parameters of JCL statements and their values.

### Modified Capabilities

## Impact

- `backend/src/paramTokenizer.js`, `keywords.js`, `errors.js`, `parser.js`, `rules/paramRules.js`.
- Fixture `nick/16-positional-limit.expected.json` (column 13 → 15).
