# Design

## Context

`paramRules.checkParamValues` switches on the keyword and calls a hand-written checker. Keyword tables (feature 3) are `Map`s of name → entry built by `table(names, marks)`. `closestKeyword` and `levenshtein` live in `paramRules`.

## Decisions

1. **`valueRules.js`** exports rule constructors (`oneOfValues`, `integer`, `char`, `name`, `quoted`, `list`, `oneOf`) and `checkValue(rule, value)` returning `null` or `{ detail, found, closest }`. `detail` is a phrase such as "must be one of A, B" or "must be a whole number from 0 to 15"; `list` items can carry a `label` ("messages") which prefixes the detail. `closest`/`levenshtein` move here, and `paramRules.closestKeyword` uses them, to avoid a require cycle.
2. **Rules as marks.** Value rules go in the existing `table()` marks (`PRTY: { value: integer(0, 15) }`). `checkParamValues(params, line, diagnostics, table)` looks up `table.get(key).value` in its default branch, after skipping `&` and `*.` values.
3. **Hand-written checks stay.** Moving RECFM/DSORG onto `JCLS009` would change their code from `JCLS003` in existing fixtures for no user benefit; they are left alone, and the rule engine covers new rules.
4. **JES3.** `jesRules.checkJes3` runs `checkValue` for keyword entries with a `value` mark.
5. **Severity.** `JCLS009` is a warning (the `JCLS` default).
