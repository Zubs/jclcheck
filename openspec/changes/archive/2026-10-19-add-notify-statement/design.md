# Design

## Context

NOTIFY is a known statement type (`since: '2.3'`) handled by the parser's default branch. Feature 14 added value rules; feature 16 added `NOTIFY_USER`; feature 13 added `parseCondition`, which requires `THEN`.

## Decisions

1. **Parser.** A `NOTIFY` case: report `JCLO009` when there is no current job or it already has steps; `JCLO010` when the job already has 8; then attach params and push `{ type: 'Notify', line, params }` onto `job.notifies` (always, if there's a job, so its values are still checked).
2. **Rules.** `checkAllParams` checks each notify with `checkKeywords` against `NOTIFY_KEYWORDS`, `checkParamValues` with the same table, the EMAIL/USER requirement (`JCLK002`) and conflict (`JCLK007`, error), and WHEN.
3. **`email(max)` rule** in `valueRules.js`: quoted, unquoted length ≤ max, exactly one `@` with text on both sides.
4. **WHEN** strips one pair of brackets or quotes and calls `parseCondition(chars, start, { requireThen: false })`; step references aren't checked, since NOTIFY sits before the steps.
5. **TYPE values** `MSG`, `EMAIL` — the values in Features.md's own example message and the reference as remembered. Nick's `TYPE=TSO` therefore gets a warning; feature 41 keeps the question.
