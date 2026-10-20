# Tasks

## 1. Rules

- [x] 1.1 Add the `email` rule, `NOTIFY_KEYWORDS` (EMAIL, USER, TYPE, WHEN) and the JOB `EMAIL` value rule; let `parseCondition` skip the THEN requirement; verify unit tests for the email rule (246 vs 247 characters, no `@`, unquoted)
- [x] 1.2 Parse NOTIFY in the parser (placement `JCLO009`, limit `JCLO010`, `job.notifies`) and check it in `paramRules` (keywords, values, `JCLK002`, `JCLK007`, WHEN); verify `test/notify-statement.test.js`: no parameters gives `JCLK002`; USER only is clean; three mixed NOTIFYs are clean; nine give `JCLO010`; after the first EXEC gives `JCLO009`; both EMAIL and USER give `JCLK007`; item 12 gives `JCLS009` at 2:33 listing MSG and EMAIL; `EMAIL='nick'` and unquoted fail; JOB `EMAIL='nick'` fails; `WHEN=(RC>4)` passes and `WHEN=(RC => 4)` gets `JCLC001`
- [x] 1.3 Remove the `todo` from `nick/12-notify-type`; set `nick/14b-notify-email` to expect `JCLS009` on `TYPE=TSO` (still provisional); verify both pass

## 2. Docs and progress

- [x] 2.1 Record `JCLK007`, `JCLO009`, `JCLO010` in Features.md (feature 17 and feature 30's code list) and the TYPE decision in feature 41; verify the text
- [x] 2.2 Run lint, tests and the build in both packages; verify all pass
- [x] 2.3 Tick feature 17 in the Features.md Progress list; verify the box is ticked and the **Done when** holds

## Workflow follow-up

- Archive the change and sync its specs.
