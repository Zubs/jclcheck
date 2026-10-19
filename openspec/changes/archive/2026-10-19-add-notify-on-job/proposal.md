# Proposal

## Why

`NOTIFY=` on the JOB statement accepts anything, so `NOTIFY=IBMUSERRRRRRRR` (too long) and `NOTIFY=laskdjasd1.&SYSUID` aren't reported (Nick's item 7).

## What Changes

- `NOTIFY` on JOB gets a `oneOf` rule: `&SYSUID`, a TSO user ID (1–8 characters, starting with a letter or `$ # @`, then letters, digits or `$ # @`; lower case accepted), or `node.userid` with a node of the same form.
- Rules may carry their own `describe`, so the message reads naturally ("NOTIFY must be &SYSUID or a TSO user ID: …").
- A keyword entry can set `checkSymbols: true` so a value containing `&` is still checked; NOTIFY uses it, because only `&SYSUID` on its own is valid there.
- A wrong value gets `JCLS009` at the value.
- `node.userid` is accepted until feature 41 settles it, so the provisional item 7c fixture stays clean; the 1–8 length follows Nick's note (feature 41 asks about 7).
- Nick's item 7a and 7b fixtures lose their `todo`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `statement-parameters`: adds the NOTIFY= rule on the JOB statement.

## Impact

- `backend/src/keywords.js`, `valueRules.js`, `rules/paramRules.js`; Features.md feature 41 notes the `node.userid` choice.
