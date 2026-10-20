# Design

## Context

Feature 8 added `JES2` lexer entries and `rules/jesRules.js`. Feature 3 added `zosLevel` and the `levels.js` helpers. `//*` lines are `COMMENT` entries with `text` = the line after `//`.

## Decisions

1. **`jes` option.** `validate(source, { zosLevel, jes = 'JES2' })` throws for an unknown JES or JES3 after 2.5 (callers check first, as with levels). `index.js` validates both before validating and returns 400 with a reason. The result includes `jes`. `levels.js` gains `JES_TYPES = ['JES2', 'JES3']` and `jesAvailable(jes, level)` using the JES3 `until: '2.5'` mark, so the rule lives in the data.

2. **Lexer knows the JES.** `lex(source, { jes })`. With JES3, a comment line whose text matches `/^\*([A-Z]+)( |$)/` with a name in `JES3_STATEMENTS` becomes `{ type: 'JES3', name, operand, operandCol, line }`; `//**` becomes `{ type: 'JES3', name: '*' }` (command). `//*DATASET` switches to data mode until `//*ENDDATASET`; data lines are stored on the DATASET entry. If the file ends first, the entry is marked `unclosed`. The lexer needs the JES because only it can stop data lines from getting `JCLL001`.

3. **Rules.** `checkJesStatements(statements, diagnostics, { jes })`:
   - JES2 entries: with JES3, `SIGNON`/`SIGNOFF` pass and others get `JCLJ305`; with JES2, feature 8's checks.
   - JES3 entries: keywords (`tokenizeParams` on the operand) checked against the statement's keyword table (`JCLJ302`); placement (`JCLJ303`) using JOB/first-EXEC position; `unclosed` → `JCLJ304`.
   - COMMENT entries: with JES3, misspelling heuristic (`JCLJ301`); with JES2, a known JES3 name + blank gets `JCLJ306` (info).

4. **Tables.** `JES3_STATEMENTS` entries carry `until: '2.5'`, `place` (`before`, `afterJob`, `beforeExec`) and an optional `keywords` table. Keyword lists come from the z/OS 2.5 JES3 statement descriptions; the existing feature 41 question about confirming the JES3 list covers them. `FORMAT` takes a positional `PR`/`PU` first; positionals aren't checked here.

5. **Values deferred.** Feature 14 builds value rules as data; JES3 keyword values are added there (a note goes into feature 14).

6. **Analytics.** `countDirectUse` records `api/jes/<jes>` alongside `api/level/<level>` for validated direct requests.

## Risks / Trade-offs

- [The misspelling heuristic misses a misspelt statement without `=`] → Such lines stay comments, as they did before; no false errors.
