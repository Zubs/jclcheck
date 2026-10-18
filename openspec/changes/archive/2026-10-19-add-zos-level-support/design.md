# Design

## Context

- `keywords.js` exports plain `Set`s (`STATEMENT_TYPES`, `JOB_KEYWORDS`, `EXEC_KEYWORDS`, `DD_KEYWORDS`). `paramRules.checkKeywords` tests `allowedSet.has(key)` and `closestKeyword` iterates the set. `parser.js` tests `STATEMENT_TYPES.has(op)`, with NOTIFY in a separate `PASSTHROUGH_OPS` set.
- `validator.validate(source)` takes no options. `index.js` calls it and returns its result as JSON.
- Direct API use is counted by `countDirectUse` in `index.js` after the response finishes.

## Goals / Non-Goals

**Goals:** one place that knows the supported levels; level marks on keywords and statement types; a level diagnostic; the level in the API.

**Non-Goals:** level marks on keyword values (no value tables exist yet; feature 14 adds them and reuses the same check). The workbench level picker (feature 27). Filling in `since` levels beyond the ones confirmed below.

## Decisions

1. **Tables as `Map`s.** Each keyword list becomes a `Map` from name to an entry object (`{}`, `{ since }`, `{ until }`), built by a small `table(names, marks)` helper from the existing name list plus an object of level marks for the few entries that have them, which keeps the diff to the lists small. `Map` keeps `.has()` working for existing callers. `closestKeyword` iterates `.keys()`. Alternative: keep the sets and add a separate `LEVELS` map. Rejected because the level would live away from the keyword it describes.

2. **Level comparison.** Levels are strings `"major.minor"`; `compareLevels(a, b)` compares numerically per part, so `"3.10"` would sort after `"3.2"`. `availability(entry, level)` returns `null` when available, otherwise `{ reason: 'since', at }` or `{ reason: 'until', at }`. `ZOS_LEVELS` and `DEFAULT_ZOS_LEVEL` (the last entry) live in a new `levels.js` so the API and rules share them.

3. **One code for both directions.** `JCLK005` covers "arrived later" and "removed". The catalog message branches on the reason. Alternative: a separate `JCLK006` for removed. Rejected: the fix is the same (pick another level or remove it), and fewer codes are easier to learn.

4. **Unknown-at-every-level stays `JCLK001`.** `checkKeywords` first asks whether the key is in the table at all (any level). Only known keys go on to the level check. So `EMAILL` gets `JCLK001` with "Did you mean 'EMAIL'?", because `closestKeyword` searches the whole table.

5. **Options object.** `validate(source, { zosLevel })` resolves the level (default if absent) and passes `{ zosLevel }` as a context to `parse` and to the rule functions that look up keywords. It returns `zosLevel` in its result. The validator trusts its caller: an unknown level is rejected by the API, and `validate` throws for one, so a bad level can't silently fall back.

6. **API validation.** `index.js` checks `zosLevel` before validating: absent or `undefined` → default; a string in `ZOS_LEVELS` → used; anything else (including numbers) → 400 `{ error: 'bad_request', message: 'Unknown z/OS level. Supported levels: 2.3, 2.4, 2.5, 3.1, 3.2.' }`.

7. **Statement types.** `STATEMENT_TYPES` becomes a table too and absorbs the passthrough ops, so NOTIFY can carry `since: '2.3'`. The parser reports a known statement that isn't available at the level with `JCLK005` at the operation column and still treats it as known.

8. **Confirmed level marks only.** `EMAIL` on JOB (`since: '2.3'`, from the z/OS 2.3 JCL Reference summary of changes) and the NOTIFY statement (`since: '2.3'`, same source). Both are at the oldest supported level, so neither changes today's results; they exist so the data is right when older levels or newer entries are added. The boundary scenarios are tested with small test-only tables passed to the level helpers. Other entries get marks only when a source is confirmed; this is recorded in Features.md feature 41.

9. **Direct-use counting.** `countDirectUse` records `api/level/<level>` when the response status is 200, reading the level from the response body set on `res.locals.zosLevel` by the handler.

## Risks / Trade-offs

- [Few real `since` marks today, so JCLK005 rarely fires in practice] → The mechanism is tested with test tables; later features (9, 17, 22) add real marks.
- [`validate()` now takes options; other callers (samples test, inspect script) pass none] → The default keeps them unchanged.

## Migration Plan

No data. Deploying the backend adds an optional field; old clients keep working.
