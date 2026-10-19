# JCLcheck — Features

This document turns the review by Nick of The Magic Mainframe ([Full Stream: Testing a Free, Online JCL Checking Tool](https://youtu.be/fi_ekgv4eq0)) into features that can be built, in the order they should be built. It builds on [Spec.md](Spec.md). Each feature notes the feedback item it comes from, using Nick's numbering, and quotes his example where he gave one. Some features come from problems found while checking his examples against the code. Those are marked *Found while reviewing*. Others came from the future ideas in Spec.md, and are marked *From Spec.md*. Features 31–35 fix bugs found later by reading the code and running small jobs through the validator, and are marked *Found in code review*. Feature 2 and features 36–40 are new ideas, marked *New idea*. Features 31–40 were added at the end, so each one says which features it must follow or should come before.

Features are ordered so that each one builds on the ones before it. The test suite, analytics and the z/OS level come first, because almost every later feature depends on them or is measured by them. The lexer fixes come next, because the parser and rules can only be as right as the statements the lexer gives them.

Tick a feature in the list below when everything under **How it works** is built, all its **Tests** pass, and its **Done when** check holds.

## How the tests are written

Tests are written in plain English and follow **ZOMBIES**. Each test is tagged with the letter it covers:

| Letter | Meaning | What it asks |
|---|---|---|
| **Z** | Zero | What happens with nothing: empty input, no parameters, no statements? |
| **O** | One | Does the simplest single case work? |
| **M** | Many | Does it still work with several, in different orders and combinations? |
| **B** | Boundaries | What happens exactly at the limits, and one step either side? |
| **I** | Interface | Is the outcome right where users and callers see it: diagnostic code, severity, line, column, message, fix and API shape? |
| **E** | Exceptions | Does bad or unexpected input give a clear diagnostic instead of a crash, a false error or silence? |
| **S** | Simple scenarios | Does a real user journey from start to finish work? |

Every JCL example in Nick's notes becomes a test fixture (feature 1). A feature is not done until its fixtures give the result Nick expected.

## Progress

- [x] 1. Regression test suite
- [x] 2. Analytics
- [x] 3. z/OS level support
- [x] 4. Columns 72–80 and comments on continued statements
- [x] 5. Quoted strings continued onto the next line
- [x] 6. In-stream data delimiters
- [x] 7. JCL inside `DD DATA`
- [x] 8. JES2 control statements
- [x] 9. JES3 control statements
- [x] 10. Several jobs in one job stream
- [x] 11. JCLLIB placement
- [x] 12. Positional parameter limits
- [x] 13. IF/THEN/ELSE conditions
- [x] 14. Keyword value rules
- [x] 15. MSGLEVEL values
- [x] 16. NOTIFY= on the JOB statement
- [x] 17. NOTIFY statement and EMAIL
- [x] 18. Keywords qualified with a procedure step
- [x] 19. Member names and other dataset name forms
- [x] 20. Duplicate DD names
- [x] 21. DD data sources, including PATH
- [x] 22. Job groups (JOBGROUP)
- [x] 23. Catalogued PROCs and INCLUDE members
- [x] 24. Cursor line and column
- [x] 25. Syntax highlighting
- [x] 26. Keyboard shortcuts
- [x] 27. z/OS level and JES picker
- [x] 28. Remembering JCL between visits
- [x] 29. Shareable links
- [x] 30. Accurate copy, help and docs
- [x] 31. DSN with LIKE
- [x] 32. Symbols in in-stream PROCs
- [x] 33. Positions on continued statements
- [x] 34. Severity of real JCL errors
- [x] 35. Stale results in the workbench
- [x] 36. Dataset flow checks
- [x] 37. Inline suppressions and site profile
- [ ] 38. Command-line tool and CI output
- [ ] 39. Formatter
- [ ] 40. Keyword explanations on hover
- [ ] 41. Questions and final checks

---

## Foundation

### 1. Regression test suite

**What it does:** Replaces the current smoke test, which only prints output, with tests that check exact results. A fix to one rule can then never quietly break another.

**From the feedback:** All items. Nick's examples are the first fixtures.

**How it works**
- Uses Node's built-in test runner (`node:test` and `node:assert`), so the backend gains no new dependency. `npm test` runs everything.
- A small helper, `expectDiagnostics(jcl, [...])`, runs the validator and compares the result with an expected list of `{ code, severity, line, column }`. Any missing or extra diagnostic fails the test, so new false positives are caught as well as missed errors.
- Each of Nick's examples is saved under `backend/test/fixtures/nick/` (for example `02-continued-comment.jcl`), next to an expected-result file (`02-continued-comment.expected.json`). Until its feature is built, a fixture is marked as a known failure (`todo`).
- The existing `valid.jcl`, `broken.jcl` and `proc.jcl` fixtures, and the three workbench samples, get expected-result files that match today's correct behaviour.
- Frontend behaviour is tested with Vitest, Vue Test Utils and jsdom, and `npm test` in `frontend/` runs it. Known frontend bugs are tests marked `test.fails`, named after the feature that fixes them. Checks that need a real browser, such as how each browser handles the F keys, stay manual.

**Tests**
- **Z** — Empty JCL gives no diagnostics and `valid: true`, and the test for it passes.
- **O** — A fixture with exactly one expected diagnostic passes when the validator returns that diagnostic.
- **M** — All fixtures run in one `npm test` call, and the summary lists how many passed, failed and are still `todo`.
- **B** — A result that differs from the expected one only by column (5 instead of 6) fails.
- **I** — A failing test prints the expected and actual diagnostics side by side, with code, line and column.
- **E** — An extra, unexpected diagnostic fails the test, and so does a missing one.
- **E** — A fixture with no expected-result file fails with a clear message instead of passing silently.
- **S** — A developer changes a rule, runs `npm test`, and sees exactly which fixtures changed.

**Done when:** `npm test` checks exact diagnostics for every existing fixture, every workbench sample and all of Nick's examples, and exits non-zero if any non-`todo` test fails.

### 2. Analytics

**What it does:** Counts how the site and the workbench are used with GoatCounter: page views, where visitors come from, and which features are used. It counts as much as possible without collecting anything personal, and never anything from the user's JCL.

*New idea:* Today there is no way to know how many people use JCLcheck, where they come from, or which features and diagnostics matter to them. That makes it hard to decide what to build next.

It comes straight after the test suite so that later features are measured from the day they ship. Each later feature adds its own events from the list below when it is built.

**How it works**

*Setup*
- GoatCounter's script (`count.js`, from `https://gc.zgo.at/count.js`) is loaded from `frontend/src/analytics.js`, not a static tag in `index.html`, so the checks below run first. It points at the count address in `VITE_GOATCOUNTER_URL` (`https://jclcheck.goatcounter.com/count`, set on Netlify). When the variable isn't set, no script loads.
- It only counts on the production hostname (`jclcheck.xyz`), not on localhost or Netlify deploy previews. The owner can exclude their own visits with GoatCounter's `#toggle-goatcounter` link.
- `frontend/src/analytics.js` wraps GoatCounter with `pageview(route)` and `track(name, detail)`. Calls made before the script loads are queued, and both do nothing, without errors, when counting is off or the script is blocked. The allowed list of events lives in `frontend/src/analyticsEvents.js`.
- Because the site is a single-page app, the script is told not to count on load (`no_onload`). `router.afterEach` in `router.js` counts each page view, so moving between `/`, `/about` and `/app` counts every page exactly once.
- A catch-all route is added for unknown addresses. It shows a "page not found" page and counts it as `/404`, so broken links show up.
- Do Not Track and Global Privacy Control are respected. When the browser has `navigator.doNotTrack` set to `"1"` or `navigator.globalPrivacyControl` set to `true`, the script isn't loaded and `pageview()` and `track()` do nothing. The workbench works exactly the same.

*What GoatCounter records for every page view*
- The page and its title.
- The referrer and campaign (`utm_*` and `ref` parameters).
- Browser, operating system and screen size, from the user agent and the screen.
- Country, and region where available. GoatCounter looks this up from the IP address and doesn't store the IP.
- Unique visits, counted with a short-lived hash and no cookies.

*Events*

Events are named `area/action/detail` and have a readable title. A detail is only ever taken from a fixed list: sample names, diagnostic codes from `errors.js`, keyword names from `keywords.js`, z/OS levels, JES names, triggers and size buckets.

| Area | Events | Feature |
|---|---|---|
| Landing and site | `cta/launch/<nav\|hero\|bottom\|footer>`, `cta/about/hero`, `faq/open/<question number>`, `outbound/<github-repo\|github-profile\|portfolio>` | today |
| Checking | `check/<f5\|button\|shortcut>` each time. Automatic checks after typing are only counted in the visit summary. | today, 26 |
| Results | `diag/seen/<CODE>` the first time a code appears in a visit. `diag/fixed/<CODE>` the first time a code goes away after the user edits the text (not after Clear or loading a sample). `diag/click/<CODE>` when a diagnostic is clicked. | today |
| Editor | `editor/paste/<size bucket>`, `sample/<clean\|broken\|proc>`, `clear/<f12\|button\|shortcut>`, `undo/<f9\|f12>` | today, 26 |
| Help | `help/open/<f1\|button\|shortcut>` | today, 26 |
| API problems | `api/unreachable`, `api/error/<status>` | today |
| Level and JES | `level/<zos>` and `jes/<JES2\|JES3>` when changed, and the current ones once per visit | 27 |
| Library | `library/add`, `library/remove` | 23 |
| Draft | `draft/restored`, `draft/corrupt` | 28 |
| Share | `share/create`, `share/open`, `share/back-to-draft`, `share/clipboard-blocked` | 29 |
| Datasets | `datasets/open`, `datasets/cell-click` | 36 |
| Suppressions and profile | `suppress/<CODE>` once per code per visit, `profile/edit`, `profile/rule/<names\|allowed\|dsnPrefixes\|extraKeywords\|severity>` once per visit for each part used | 37 |
| Formatter | `format/<f4\|button\|shortcut>`, `format/applied`, `format/cancelled`, `format/refused` | 39 |
| Explanations | `hover/<KEYWORD>` once per keyword per visit, `hover/shortcut` | 40 |

- **Visit summary:** when the workbench page is hidden or closed, a short set of `visit/` events is sent, using buckets instead of exact numbers:
  - how many checks ran (`visit/checks/<1|2-5|6-20|21-100|100+>`)
  - the largest JCL checked, in lines (`visit/lines/<1-10|11-50|51-200|201-1000|1000+>`)
  - time spent on the workbench (`visit/time/<0-1m|1-5m|5-20m|20m+>`)
  - the typical API response time (`visit/latency/<0-250ms|250ms-1s|1s+>`)
  - whether the last check was clean (`visit/end/<clean|errors|warnings>`)
- Counting codes "seen" and "fixed" shows which diagnostics confuse people: a code that is often seen but rarely fixed has a message or fix that needs work.

*API use*
- Every check is counted exactly once, wherever it comes from:
  - A check from the workbench is counted in the browser, as the events above. The workbench sends an `X-JCLcheck-Client: workbench` header with its API requests, and the backend never counts a request with that header. This also means a workbench user with Do Not Track or Global Privacy Control set is counted nowhere.
  - A request from anywhere else, such as `curl`, a script or another site, is counted by the backend.
- The backend counts requests to `/api/validate`, `/api/format` and `/api/keywords` without that header through GoatCounter's API, as `api/<endpoint>/direct`. Each hit includes:
  - the user agent, such as `curl` or a script's HTTP library
  - the client's IP address, so GoatCounter can record the country and then drop the IP
  - the z/OS level and JES asked for, as `api/level/<zos>` and `api/jes/<JES2|JES3>`
  - whether the request was valid, as `api/result/<ok|bad-request|error>`
- Direct requests with a `DNT: 1` or `Sec-GPC: 1` header are not counted.
- Hits are queued and sent in batches every 10 seconds, and when the host stops the service (Render spins idle free-tier services down). Failures are dropped and never slow down or break an API response. The token comes from `GOATCOUNTER_TOKEN`, and nothing is sent when it isn't set.
- The API runs on Render (`https://jclcheck.onrender.com`) behind a proxy, so `TRUST_PROXY` (the number of proxies, `1` to start) tells the backend to read the client's real IP from `X-Forwarded-For`.

*CLI use (opt-in)*
- The backend's `POST /api/usage` endpoint is built here: it accepts up to 30 events from the CLI's allowed list (`cli/…`), rejects anything else with a 400 response, skips requests with `DNT: 1` or `Sec-GPC: 1`, and forwards the rest to GoatCounter.
- The CLI's own opt-in counting is part of feature 38.

*What is never sent*
- JCL text or any part of it, including names, dataset names, PARM values, unknown keywords and in-stream data.
- The `#jcl=…` part of a shared link (feature 29), the site profile's contents (feature 37) and library member names (feature 23).
- Query strings, apart from `zos`, `jes`, `ref` and `utm_*`.
- Cookies or any visitor ID kept in the browser.
- `track()` checks every detail against its allowed list and drops anything else, so a later change can't leak typed text by mistake.

*Dashboard and consent*
- The GoatCounter dashboard stays private, and only the owner can see the numbers. They are used to decide what to build next. The code that does the counting is open source, so anyone can see what is collected, just not the totals.
- No consent banner is shown, since nothing is stored in the browser and no personal data is kept.

*Privacy copy*
- The landing page trust line, the FAQ, help and the Privacy line in Spec.md say that the site counts anonymous usage with GoatCounter, with no cookies and no personal data. They list what is counted, and they keep saying that JCL is never stored or counted. The FAQ's structured data in `router.js` is updated to match.

**Tests**
- **Z** — With no `VITE_GOATCOUNTER_URL`, or on a hostname other than `jclcheck.xyz`, no script loads, `track()` does nothing, and the site works as before. With no `GOATCOUNTER_TOKEN`, the API sends nothing.
- **O** — Opening `/` on the production hostname counts one page view for `/`.
- **M** — Moving from `/` to `/about` to `/app` inside the app counts three page views, and the first page isn't counted twice.
- **M** — Typing for a minute with 30 automatic checks sends no `check/` events and one `visit/checks/21-100` in the visit summary.
- **B** — A code seen in three checks in one visit counts once as `diag/seen`. JCL of 10 lines falls in `1-10`, and 11 lines in `11-50`.
- **I** — Every `track()` call in the code uses a name from the event table, and a test compares the two. Each event has a readable title in the GoatCounter dashboard.
- **E** — With GoatCounter blocked by an ad blocker, every workbench feature works and there are no console errors.
- **E** — With GoatCounter's API down or slow, `/api/validate` responds in its normal time.
- **E** — A test checks, edits and pastes JCL containing a unique marker string, and clicks its diagnostics. The marker never appears in anything sent to GoatCounter. Neither does the `#jcl=` part of the address. Features 29 and 39 extend this test to sharing and formatting.
- **E** — A `track()` call with a detail that isn't on its allowed list sends nothing.
- **E** — With Do Not Track or Global Privacy Control on, no request goes to GoatCounter from the browser, and the backend doesn't count that browser's checks.
- **O** — One `curl` request to `/api/validate` is counted once by the backend as `api/validate/direct`. One check from the workbench is counted once, by the browser only.
- **E** — A direct request with `Sec-GPC: 1` is not counted.
- **I** — `/api/usage` rejects an unknown event name with a 400 response.
- **S** — After a week, the owner opens the GoatCounter dashboard and sees visitors by country, top pages and referrers, which samples and features are used, and which diagnostic codes are seen most and fixed least.

**Done when:** Page views, countries, referrers, browsers and today's features are counted in GoatCounter, direct API use is counted once by the backend, `/api/usage` accepts CLI reports, Do Not Track and Global Privacy Control are respected, no JCL or other personal data is ever sent, and the site's privacy copy says exactly what is collected. Later features send their own events from the table above when they are built.

### 3. z/OS level support

**What it does:** The validator can check JCL against a chosen z/OS release. A keyword such as `EMAIL=` on the JOB statement is then accepted where it exists and explained where it doesn't. This also answers Nick's question about which level of the JCL reference the tool follows.

**From the feedback:** Item 10, "What level of the JCL reference does this tool use? This is valid JCL in z/OS 2.3 and above". Item 11, "It would be nice if there was a way to pick what level of z/OS is being used".

```
//RARE JOB MSGLEVEL=(1,1),EMAIL='nick-becker@themagicmainframe.com'
//STEP1 EXEC PGM=IEFBR14
```

**How it works**
- `keywords.js` changes from plain sets to tables. Each keyword, statement type and value can carry a `since` level (for example `EMAIL` on JOB is `since: '2.3'`). Anything without a `since` is available at every supported level.
- An entry can also carry an `until` level, for things IBM removed in a later release. JES3 (feature 9) is the first user of this, with `until: '2.5'`.
- Supported levels are listed in one place, `ZOS_LEVELS` (proposed: 2.3, 2.4, 2.5, 3.1, 3.2). The default is the newest level.
- `POST /api/validate` accepts an optional `zosLevel` (for example `"3.1"`). The response includes the level that was used, so callers always know which rules applied.
- A keyword that exists but arrived after the chosen level gets a new warning, `JCLK005`: "'EMAIL' on the JOB statement is available from z/OS 2.3. You are checking against z/OS 2.2." This is separate from `JCLK001` (unknown keyword).
- The `since` levels are taken from the "Summary of changes" sections of the IBM z/OS MVS JCL Reference for each release. Each entry notes its source in a comment.

**Tests**
- **Z** — With no `zosLevel` in the request, the newest level is used and the response says so.
- **O** — `EMAIL=` on a JOB statement is accepted at z/OS 2.3.
- **B** — At the oldest supported level, a keyword marked `since` that level is accepted, and a keyword marked `since` the next level gets `JCLK005`.
- **B** — An entry marked `until: '2.5'` is accepted at 2.5 and reported as removed at 3.1.
- **M** — The same JCL checked at two levels gives different results only for keywords whose `since` falls between them.
- **I** — `JCLK005` names the keyword, the statement, the level it arrived in and the level being checked, and suggests choosing a newer level.
- **I** — The response includes `zosLevel` next to `diagnostics`, `ast` and `stats`.
- **E** — An unknown level such as `"9.9"` or `"abc"` gets a 400 response listing the supported levels, and nothing is validated.
- **E** — A misspelled keyword (`EMAILL=`) still gets `JCLK001` with "Did you mean 'EMAIL'?", not `JCLK005`.
- **S** — Nick's item 10 example is clean at the default level.

**Done when:** Nick's item 10 example gives no diagnostics at the default level, and the API reports which z/OS level every result was checked against.

---

## Reading JCL (lexer)

### 4. Columns 72–80 and comments on continued statements

**What it does:** Reads the fixed columns of an 80-column JCL record the way z/OS does. Columns 1–71 hold the statement, a non-blank character in column 72 continues a comment, and columns 73–80 are sequence numbers that are ignored.

**From the feedback:** Item 2, "Issue with continued line comment, here is an example from the JCL reference (this is syntactically valid JCL)".

```
//NICKJOB JOB
//STP4  EXEC PROC=BILLING,COND.PAID=((20,LT),EVEN),
//     COND.LATE=(60,GT,FIND),
//     COND.BILL=((20,GE),(30,LT,CHGE))  THIS STATEMENT CALLS          X
//     THE BILLING PROCEDURE AND SPECIFIES RETURN CODE TESTS           X
//     FOR THREE PROCEDURE STEPS.
```

Today, lines 5 and 6 are read as new statements, with operation `THE` and `FOR` (`JCLP002`).

**How it works**
- The lexer only reads columns 1–71 when splitting fields. Column 72 is the continuation column, and columns 73–80 are thrown away before parsing.
- When a line's operand is complete and column 72 is not blank, the following lines are a continued comment. Each one starts with `//`, has a blank in column 3, and its text is added to the statement's comment and never parsed. The comment continues for as long as each line has a non-blank column 72.
- A continued operand (ending in a comma) that also has text in column 72 still works as it does today. The comment part is kept separate.
- The existing `JCLL002` (line over 80 characters) stays as it is.
- The lexer's header comment and `HelpModal.vue` are updated to describe the column rules.

**Tests**
- **Z** — A statement with a blank column 72 and no comment is read exactly as today.
- **O** — A statement with a comment and an `X` in column 72, followed by one comment line, gives one statement whose comment contains both parts.
- **M** — Nick's item 2 example gives one EXEC statement over five lines. The operation is never `THE` or `FOR`, and there is no `JCLP002`.
- **B** — A character in column 71 is part of the statement, a character in column 72 is the continuation mark, and characters in columns 73–80 are ignored.
- **B** — A line of exactly 80 characters with sequence numbers `00010000` in columns 73–80 gives no diagnostics.
- **I** — Diagnostics on a continued comment's statement point to the line where the statement starts.
- **E** — Column 72 is marked but the next line is a new statement (non-blank column 3). This gets a clear "continuation expected" diagnostic instead of the new statement being swallowed.
- **E** — Column 72 is marked on the last line of the file. This gets the same diagnostic without a crash.
- **S** — A user pastes card-image JCL with sequence numbers in every line and sees no errors caused by the numbers.

**Done when:** Nick's item 2 example gives no `JCLP002`, and JCL with sequence numbers in columns 73–80 checks clean.

### 5. Quoted strings continued onto the next line

**What it does:** Accepts a quoted value that is broken at column 71 and continued in column 16 of the next line, as the JCL reference allows.

**From the feedback:** Item 3, "the quoted string can continue onto the next line as long as the next line starts in column 16 and starts with a //".

```
//NICKJOB JOB
//S1       EXEC PGM=IEFBR14,PARM='THIS IS A LONG PARAMETER WITHIN APOST
//             ROPHES, CONTINUED IN COLUMN 16 OF THE NEXT RECORD'
```

Today this gives `JCLL003` (unterminated quoted string) and `JCLP003` (unmatched parenthesis). The cause is that each continuation line is scanned for quotes on its own, so the closing `'` on line 3 is mistaken for an opening one.

**How it works**
- When a line ends inside an open quote, the lexer treats the string as running through column 71. A line that stops short of column 71 is padded with blanks, as it would be on a real 80-column record.
- The next line must start with `//`, have blanks in columns 3–15 and continue the string in column 16. Its text from column 16 onwards is joined directly to the string.
- Quote and parenthesis tracking runs over the whole joined operand, never over a single continuation line in isolation.
- If the continued text starts in any column other than 16, a new diagnostic, `JCLL005`, is raised: "A continued quoted string must resume in column 16 (found column N)."
- Feature 4's column rules still apply: columns 72–80 of the first line are not part of the string.

**Tests**
- **Z** — A quoted value that opens and closes on one line is read exactly as today.
- **O** — Nick's item 3 example gives no diagnostics, and the PARM value contains the full sentence.
- **M** — A string continued over three lines is joined in order into one value.
- **B** — The continuation text starts in column 16 and is accepted. Starting in column 15 or 17 gives `JCLL005` with the column it found.
- **B** — A string whose first line ends exactly at column 71 joins with no extra blanks. One that ends at column 60 includes the blanks up to column 71.
- **I** — `JCLL005` points to the continuation line and the column where the text actually starts.
- **E** — A doubled quote (`''`) split across the line break is still read as one literal quote.
- **E** — A string that is never closed, even after continuing, still gets `JCLL003` on the last line, and no `JCLP003` appears just because of it.
- **S** — A user writes a long PARM, breaks it at column 71 and continues in column 16, and the job checks clean.

**Done when:** Nick's item 3 example checks clean, and a continuation that starts in the wrong column gets `JCLL005`. (`JCLL004` is feature 4's column-72 diagnostic.)

### 6. In-stream data delimiters

**What it does:** Supports `DLM=` on `DD *` and `DD DATA`, so in-stream data can contain `/*` and ends only at the chosen delimiter. It also ends default in-stream data at `/*` followed by a comment.

**From the feedback:** Item 15, "Delimiters not supported on DD * and DD DATA".

```
//SYSUT1 DD *,DLM=@@
LINE ONE
/* NOT THE END
@@
```

Today `DLM` gets `JCLK001` (unknown keyword). Only delimiters made of two letters or digits are matched, so `@@`, `$$` and quoted delimiters are missed.

**How it works**
- `DLM` is added to the DD keyword table.
- The delimiter is exactly two characters. Letters, digits and national characters (`$ # @`) can be written as they are (`DLM=@@`), and any other characters must be quoted (`DLM='%%'`, with `''` for a quote inside).
- With `DLM=` set, the data ends only at a line that starts in column 1 with the delimiter. `/*` and `//` lines are part of the data.
- With no `DLM=`:
  - `DD *` ends at `/*` in columns 1–2 followed by a blank or the end of the line, or at the next `//` statement.
  - `DD DATA` ends only at `/*`.
  - `/* comment` therefore ends the data, as it does on z/OS.
- The unused `isDelimiterLine` helper in `lexer.js` is either used for this or removed.
- New diagnostics:
  - A `DLM=` value that isn't two valid characters gets the warning `JCLS011`.
  - Data that needs an explicit delimiter (`DD DATA`, or any `DLM=`) and reaches the end of the file without it gets the warning `JCLL006`, naming the delimiter it was waiting for. `DD *` without `DLM=` can end with the input.
  - `DLM=` on a DD with no in-stream data gets the warning `JCLK006`.

**Tests**
- **Z** — `DD *` followed directly by `/*` gives an empty in-stream data block and no diagnostics.
- **O** — `DD *,DLM=@@` with one data line and `@@` gives no diagnostics.
- **M** — Two DDs in the same step with different delimiters each end at their own delimiter.
- **B** — `DLM=@@`, `DLM=$$` and `DLM='%%'` are accepted. `DLM=@`, `DLM=@@@` and `DLM=` are rejected.
- **B** — `@@` in column 1 ends the data. ` @@` (starting in column 2) does not.
- **I** — With `DLM=` set, a `/*` data line is not reported as a statement and gets no `JCLL001`.
- **E** — A missing delimiter at the end of the file gets one warning naming `@@`, and no errors on the data lines.
- **E** — `DLM=` on a DD with no in-stream data gets a warning that it has no effect.
- **S** — A user embeds a SORT control card containing `/*` in a `DD *,DLM=$$` block, and the job checks clean.

**Done when:** `DLM=` is accepted on `DD *` and `DD DATA` with any valid two-character delimiter, and data ends exactly where z/OS would end it.

### 7. JCL inside `DD DATA`

**What it does:** Treats lines starting with `//` inside `DD DATA` as data, so a job can carry another job's JCL, for example to submit it through the internal reader.

**From the feedback:** Item 14, "DD data allows you to embed JCL as instream data, the tool does not allow this".

```
//SYSUT1 DD DATA
//NESTED JOB MSGLEVEL=(1,1)
//STEP1  EXEC PGM=IEFBR14
/*
//SYSUT2 DD SYSOUT=(*,INTRDR)
```

Today the `//NESTED JOB` line ends the data, which gives `JCLO004` (a second JOB), and the `/*` then gets `JCLL001`.

**How it works**
- Builds on feature 6. Only `DD *` ends at a `//` line. `DD DATA` ends only at `/*` or its `DLM=` delimiter.
- The data lines are kept on the DD node as today and are not parsed as JCL.
- If `DD DATA` contains a JOB statement, and the step also has a `SYSOUT=(*,INTRDR)` DD, the tool adds an `info` diagnostic: "This in-stream JCL will be submitted as a separate job and is not checked here." It doesn't check the nested job, so there are no surprise errors from data.

**Tests**
- **Z** — `DD DATA` followed directly by `/*` gives no diagnostics.
- **O** — `DD DATA` containing one `//` line ends at `/*`, and the `//` line is not a statement.
- **M** — Nick's item 14 example gives no `JCLO004` and no `JCLL001`, and the step has four DDs.
- **B** — The same nested lines under `DD *` end the data at the first `//` line, as before.
- **I** — The info note appears once, on the `DD DATA` line, only when the data contains a JOB statement and the step writes to `INTRDR`.
- **E** — `DD DATA` with no `/*` before the end of the file gets the missing-delimiter warning from feature 6, and the nested JCL is not checked.
- **S** — A user builds an IEBGENER job that submits a nested job through the internal reader, and the outer job checks clean.

**Done when:** Nick's item 14 example gives no errors, apart from any caused by keywords that later features add.

### 8. JES2 control statements

**What it does:** Recognises JES2 control statements such as `/*ROUTE` and `/*JOBPARM` instead of rejecting them as "does not begin with //".

**From the feedback:** Item 8, "No support for JES2 JECL statements (e.g. /*ROUTE)".

```
//RARE JOB MSGLEVEL=(1,1)
/*ROUTE PRINT NODE1
/*ROUTE PUNCH NODE3
/*ROUTE XEQ N5
//STEP1 EXEC PGM=BEEF
```

**How it works**
- The lexer recognises a line starting with `/*` followed straight away by a letter (no blank) as a JES2 control statement (`type: 'JES2'`), not a delimiter. This applies outside in-stream data only.
- A table of known JES2 statements is added to `keywords.js`, with `since` levels where needed: `JOBPARM`, `MESSAGE`, `NETACCT`, `NOTIFY`, `OUTPUT`, `PRIORITY`, `ROUTE`, `SETUP`, `SIGNOFF`, `SIGNON`, `XEQ`, `XMIT`. A `/*$` command is recognised too.
- Simple checks, taken from the JES2 reference:
  - The statement name is known (`/*ROUTEE` gets a "did you mean" suggestion).
  - `/*ROUTE` starts with `PRINT`, `PUNCH` or `XEQ`, followed by a destination.
  - Placement is checked (for example `/*PRIORITY` goes before the JOB statement and the others after it).
- New code group `JCLJxxx` for JES2 statements. These are warnings by default, because shops use exits and local extensions.
- JES3 statements (`//*MAIN`, etc.) are handled by feature 9. When JES2 is selected, `//*` lines are still comments.

**Tests**
- **Z** — A job with no JES2 statements is checked exactly as before.
- **O** — One `/*ROUTE PRINT NODE1` after the JOB statement gives no diagnostics.
- **M** — Nick's item 8 example gives no diagnostics.
- **B** — `/*` followed by a blank is still a delimiter in in-stream data. `/*ROUTE` inside `DD *` data with `DLM=` is data.
- **I** — An unknown JES2 statement gets a `JCLJ` warning on its line, with a "did you mean" suggestion.
- **E** — `/*ROUTE` with no operand, or with a first word other than PRINT, PUNCH or XEQ, gets a warning listing the allowed values.
- **E** — A JES2 statement placed in the wrong position gets a placement warning, not `JCLL001`.
- **S** — A user pastes a production job with `/*JOBPARM` and `/*ROUTE` cards, and only real mistakes are reported.

**Done when:** Nick's item 8 example checks clean, and no JES2 statement ever gets `JCLL001`.

### 9. JES3 control statements

**What it does:** Recognises and checks JES3 control statements such as `//*MAIN` and `//*FORMAT` on the z/OS levels that still ship JES3. Today they are silently treated as comments.

*From Spec.md:* "More keyword coverage (for example JES2/JES3 control statements…)". JES2 is covered by feature 8.

**How it works**
- Builds on feature 3. IBM removed JES3 in z/OS 3.1, so every JES3 entry carries `until: '2.5'`, and JES3 can only be chosen at z/OS 2.5 or earlier.
- A shop runs either JES2 or JES3, never both, so the request takes a new `jes` option: `"JES2"` (the default) or `"JES3"`. Asking for JES3 at z/OS 3.1 or later gets a 400 response explaining that JES3 was removed in 3.1. The workbench choice is added in feature 27.
- With JES3 selected:
  - A line starting `//*` followed straight away by a known JES3 statement name and a blank (for example `//*MAIN CLASS=A`) is a JES3 statement (`type: 'JES3'`).
  - Any other `//*` line is still a comment, so `//*MAINFRAME NOTES` stays a comment.
  - `//**` lines are JES3 command statements.
- A table of JES3 statements and their keywords is added to `keywords.js`, taken from the JES3 reference for z/OS 2.5: `DATASET` and `ENDDATASET`, `FORMAT`, `MAIN`, `NET`, `NETACCT`, `OPERATOR`, `PAUSE`, `PROCESS` and `ENDPROCESS`, `ROUTE`, plus `/*SIGNON` and `/*SIGNOFF`.
- The keywords are checked with the value rules from feature 14, for example `MAIN` taking `CLASS`, `SYSTEM`, `LINES`, `HOLD` and `FAILURE`.
- Placement rules come from the JES3 reference. For example, most JES3 statements go after the JOB statement and before the first EXEC, and `//*DATASET` must be closed by `//*ENDDATASET`.
- JES2 statements (feature 8) found while JES3 is selected get a warning that they are JES2 statements, and the other way round. With JES2 selected, a `//*MAIN`-style line gets an `info` note: "This looks like a JES3 statement. It is treated as a comment unless JES3 is selected."
- JES3 diagnostics share the `JCLJ` group, numbered `JCLJ3xx`. Like the JES2 codes, they are warnings by default.

**Tests**
- **Z** — With JES2 selected (the default), a job containing `//*MAIN` is checked exactly as before, plus one info note.
- **O** — With JES3 at z/OS 2.5, `//*MAIN CLASS=A` after the JOB statement gives no diagnostics.
- **M** — A job with `//*MAIN`, `//*FORMAT PR` and `//*NETACCT` statements, all valid, gives no diagnostics.
- **B** — JES3 can be chosen at z/OS 2.5, and choosing it at z/OS 3.1 gets a 400 response.
- **B** — `//*MAIN CLASS=A` is a JES3 statement. `//*MAINFRAME NOTES` and `//* MAIN` stay comments.
- **I** — A misspelled statement (`//*MIAN`) gets a `JCLJ3` warning with "Did you mean 'MAIN'?".
- **E** — An unknown keyword on `//*MAIN`, or a `//*DATASET` with no `//*ENDDATASET`, gets a clear diagnostic and doesn't crash.
- **E** — A `/*ROUTE` JES2 statement in a job checked as JES3 gets a warning that it is a JES2 statement.
- **S** — A user from a JES3 shop on z/OS 2.4 chooses JES3, pastes a production job with `//*MAIN` and `//*FORMAT` cards, and only real mistakes are reported.

**Done when:** With JES3 selected at z/OS 2.5 or earlier, JES3 statements are recognised and checked, JES3 can't be chosen at 3.1 or later, and JES2 checking is unchanged.

---

## Job structure

### 10. Several jobs in one job stream

**What it does:** Accepts several JOB statements in one input and checks each job on its own, as JES does when a job stream is submitted.

**From the feedback:** Item 4, "Technically you can submit one job stream with multiple JOB statements in it, the tool only allows one job in the jobstream".

```
//NICKJOB JOB TYPRUN=SCAN
//        EXEC PGM=IEBGENER
//NICKJOB2 JOB MSGLEVEL=(1,1)
```

*Found while reviewing:* the `//` null statement, which marks the end of a job, doesn't end the job today.

**How it works**
- The parser builds `jobs: []` instead of a single `job`. A JOB statement closes the current job and starts a new one, and so does the null statement (`//`).
- Every rule (DD rules, parameter rules, PROC rules) runs for each job. Duplicate-name checks and step references stay inside their own job.
- In-stream PROCs belong to the job they are written in. A PROC can only be called from the same job. (Where a PROC placed before the first JOB statement should belong is a question in feature 41.)
- Statements after a null statement and before the next JOB get a new error, `JCLO007`: "Statement after the end of the job (//). Start a new job with a JOB statement."
- `JCLO004` (only one JOB per job) is removed from the catalogue.
- API: `ast.jobs` replaces `ast.job`. `stats` gains `jobCount`, and `stepCount` adds up the steps across all jobs. Nothing in the frontend reads `ast.job`, so the frontend needs no change for this. This change is noted in the README.

**Tests**
- **Z** — Input with no JOB statement still gets `JCLO001`, once.
- **O** — A single job is checked exactly as before, and `jobCount` is 1.
- **M** — Nick's item 4 example gives two jobs, no `JCLO004`, and `jobCount: 2`.
- **M** — Two jobs that both have a step `STEP1` with a DD `SYSUT1` give no duplicate-name diagnostics.
- **B** — `//` straight after the last statement gives no diagnostics. `//` followed by a JOB statement starts the second job cleanly.
- **I** — A diagnostic in the second job points to its own line, and `stepCount` is the total across both jobs.
- **E** — An EXEC after `//` and before the next JOB gets `JCLO007`.
- **E** — A step in job 2 calling an in-stream PROC defined only in job 1 gets `JCLR001`.
- **S** — A user pastes a job stream with three jobs from a library member, and each job's problems are reported against the right lines.

**Done when:** Nick's item 4 example checks clean, and each job in a stream is checked independently.

### 11. JCLLIB placement

**What it does:** Checks that a JCLLIB statement is placed after the JOB statement and before the first EXEC, and that each job has at most one.

**From the feedback:** Item 17, "JCLLIB must appear before EXEC statement and after JOB statement".

```
//CLEAN JOB ,'The Magic Mainframe',MSGLEVEL=(1,1)
//S2       EXEC    PROC=MYPROC2
//      EXEC PGM=IEFBR14
//MYLIBS2  JCLLIB  ORDER=(CAMPBEL.PROCS.JCL,PUCHKOF.PROCS.JCL,
//            YUILL.PROCS.JCL,GARY.PROCS.JCL)
```

**How it works**
- JCLLIB stops being a pass-through statement in `parser.js`. It becomes a node on the job, with its `ORDER=` list.
- New ordering errors:
  - `JCLO005`: "JCLLIB must come after the JOB statement and before the first EXEC statement."
  - `JCLO006`: "Only one JCLLIB statement is allowed per job."
  - `JCLO008`: "JCLLIB is not allowed inside a procedure."
- `ORDER=` is required, and each library in it is checked with the DSN rules from feature 19.
- A JCLLIB inside an in-stream PROC is an error (`JCLO008`).
- A PROC call that can't be resolved in-stream (`JCLR001`) mentions the JCLLIB libraries in its message when the job has them, for example "…may be found in CAMPBEL.PROCS.JCL or 3 other libraries". The call stays a warning.

**Tests**
- **Z** — A job with no JCLLIB gives no JCLLIB diagnostics.
- **O** — A JCLLIB between the JOB and the first EXEC gives no diagnostics.
- **M** — Nick's item 17 example gets `JCLO005` on line 4.
- **B** — A JCLLIB directly after the JOB statement is accepted. One directly after the first EXEC gets `JCLO005`.
- **I** — `JCLO005` points to the JCLLIB line, and its fix says where to move it.
- **E** — Two JCLLIB statements in one job give `JCLO006` on the second.
- **E** — A JCLLIB without `ORDER=` gets `JCLK002` (missing required parameter).
- **E** — A library name longer than 44 characters inside `ORDER=` gets `JCLS006`.
- **S** — A user moves the JCLLIB above the first EXEC as suggested, and the diagnostic disappears.

**Done when:** Nick's item 17 example gets `JCLO005`, and the corrected version checks clean.

### 12. Positional parameter limits

**What it does:** Limits each statement to the positional parameters it is allowed. On the JOB statement those are the accounting information and the programmer's name.

**From the feedback:** Item 16, "only two positional parameters supported on the JOB statement".

```
//CLEAN JOB ,,,,,,,,,,,,,,,MSGLEVEL=(1,1)
```

**How it works**
- `keywords.js` sets how many positional parameters each statement allows:
  - JOB: 2 (accounting, programmer name)
  - EXEC: 1 (procedure name)
  - DD: 1 (`*`, `DATA`, `DUMMY` or `DYNAM`)
- The tokeniser keeps empty positional parameters (`,,`) as empty entries, so they can be counted.
- New error, `JCLK004`: "The JOB statement allows at most 2 positional parameters (accounting information and programmer's name); found 15." (Nick's example has 15 commas, so 15 positionals.) It points at the first positional over the limit.
- Size limits from the reference: accounting information is at most 143 characters, and the programmer's name at most 20 characters (warning `JCLS012`). A name containing special characters must be quoted (warning `JCLS013`).
- A positional parameter after a keyword parameter still gets `JCLK003` as today.

**Tests**
- **Z** — `//J JOB` with no parameters gives no diagnostics.
- **O** — `//J JOB (ACCT)` and `//J JOB ,'NAME'` are both accepted.
- **M** — Nick's item 16 example gets one `JCLK004`, not one diagnostic for each comma.
- **B** — Two positional parameters are accepted, and three are rejected. A programmer's name of 20 characters is accepted, and 21 is rejected.
- **I** — `JCLK004` names the statement, the limit and the number found.
- **E** — A programmer's name with special characters and no quotes gets a warning to quote it.
- **E** — A DD with two positional parameters (`DD *,DUMMY`) gets `JCLK004`.
- **S** — A user writes `//PAYROLL JOB (ACCT),'J SMITH',CLASS=A` and it checks clean.

**Done when:** Nick's item 16 example gets exactly one `JCLK004`, and correct JOB statements still check clean.

### 13. IF/THEN/ELSE conditions

**What it does:** Checks the condition on every IF statement and records which steps sit in its THEN and ELSE branches. Today only the IF/ENDIF balance is checked, so a bad condition or a reference to a step that doesn't exist goes unnoticed.

*From Spec.md:* "Evaluating IF/THEN/ELSE conditions so that excluded steps are skipped." A static checker can't know the return codes a job will produce, so this feature checks the conditions and the branch structure. Simulating return codes to show which steps would run is not planned.

**How it works**
- Builds on feature 10, because step references must stay inside their own job.
- The IF operand is parsed into an expression tree:
  - Keywords: `RC`, `ABEND`, `¬ABEND`, `ABENDCC`, `RUN` and `¬RUN`, either on their own or qualified as `step.RC` or `step.procstep.RC`.
  - Comparison operators: `GT`, `GE`, `LT`, `LE`, `EQ`, `NE` and their symbols (`>`, `>=`, `<`, `<=`, `=`, `¬=`).
  - `NOT` (`¬`), `AND` (`&`), `OR` (`|`) and brackets.
  - The statement must end with `THEN`.
- Values are checked:
  - `RC` is compared with a whole number from 0 to 4095.
  - `ABENDCC` takes a system code (`Sxxx`, three hex digits) or a user code (`Unnnn`, 0000–4095).
- A step reference must name a step that comes earlier in the same job. A reference to a procedure step must name a step in the called in-stream PROC.
- The `IfNode` gains `then` and `else` lists of the steps inside each branch. Steps stay in `job.steps` in their written order as well, so the existing rules don't change.
- Each IF can have at most one ELSE. IF blocks can be nested up to the limit the reference sets (15 levels, to be confirmed in feature 41).
- A new code group, `JCLCxxx`, covers condition errors, such as "'STEP9' in this IF condition is not an earlier step in this job."

**Tests**
- **Z** — A job with no IF statements is checked exactly as before.
- **O** — `// IF (STEP1.RC = 0) THEN` after a step called STEP1 gives no diagnostics, and STEP1's later steps sit in the THEN branch.
- **M** — A condition combining `AND`, `OR`, `NOT` and brackets (`IF (S1.RC = 0 & ¬S2.ABEND) | S3.RUN THEN`) gives no diagnostics.
- **M** — An IF with both THEN and ELSE steps puts each step in the right branch.
- **B** — `RC = 4095` is accepted, and `RC = 4096` is rejected. Nesting at the limit is accepted, and one level deeper is rejected.
- **B** — `ABENDCC=S0C4` and `ABENDCC=U4095` are accepted. `ABENDCC=S0C` and `ABENDCC=U4096` are rejected.
- **I** — A `JCLC` diagnostic points to the column of the bad part of the condition, not just the start of the line.
- **E** — A reference to a later step, or to a step that doesn't exist, gets a `JCLC` error naming the step.
- **E** — A missing `THEN`, an unknown operator (`RC => 4`), unbalanced brackets and a second ELSE each get a clear diagnostic, and none of them crash.
- **S** — A user writes a job that runs a clean-up step only when the main step fails, and it checks clean. A typo in the step name is caught.

**Done when:** Every IF condition is parsed and checked, step references are confirmed against earlier steps, and the AST shows which steps sit in each branch.

---

## Parameter values

### 14. Keyword value rules

**What it does:** Checks the values of keyword parameters, not just their names, using one shared way to describe what a keyword allows.

**From the feedback:** Item 12, "I think a general thing that is missing is checking the values for keyword parameters".

```
//N1   NOTIFY USER=IBMUSER,TYPE=EMAILaasdasd
```

**How it works**
- Each keyword in `keywords.js` can have a value rule built from a few reusable types:
  - `enum` (a fixed list)
  - `integer` (with a minimum and maximum)
  - `char` (one character from a set)
  - `name` (a length and allowed characters)
  - `quoted` (a length)
  - `list` (rules for each position and a count)
  - `oneOf` (any of several rules)
- One function, `checkValue(rule, value)`, applies a rule and returns what went wrong. The existing hand-written checks (DISP, SPACE, DCB, REGION, TIME, DSN, RECFM, DSORG) keep working with their own codes (`JCLS001`–`JCLS008`). Moving them onto the rules would have changed those codes in existing results for no gain, so they were left as they are.
- A new warning, `JCLS009`, covers any value that breaks its rule. The message is built from the rule, for example "TYPE must be one of MSG, EMAIL; found 'EMAILAASDASD'." A "did you mean" suggestion is added for `enum` values.
- Values that are symbolic (`&SYM`) or that come from a referback are skipped, as the DSN check already does.
- A first set of rules: `CLASS` and `MSGCLASS` (one character A–Z or 0–9), `TYPRUN` (SCAN, HOLD, JCLHOLD, COPY), `PRTY` (0–15), `ADDRSPC` (VIRT, REAL), `RD` (R, RNC, NR, NC), `FREE` (END, CLOSE), `AVGREC` (U, K, M) and `RETPD` (0–93000). Features 15–17 add MSGLEVEL and NOTIFY.

- *Added by feature 9:* JES3 statement keywords (`//*MAIN`, `//*FORMAT`, `//*NET`, `//*NETACCT`, `//*DATASET`) are checked by name only so far. Their values should get rules here too, for example `MAIN HOLD=YES|NO`.

**Tests**
- **Z** — A keyword with no value rule is accepted with any value, as today.
- **O** — `TYPRUN=SCAN` is accepted, and `TYPRUN=SCAM` gets `JCLS009` with "Did you mean 'SCAN'?".
- **M** — A JOB statement with five bad values gets five `JCLS009` warnings, each pointing to its own value.
- **B** — `PRTY=0` and `PRTY=15` are accepted. `PRTY=-1` and `PRTY=16` are rejected.
- **B** — `CLASS=A` is accepted, and `CLASS=AB` is rejected.
- **I** — `JCLS009` points to the value's column, not the keyword's, and its message lists what was allowed.
- **E** — `CLASS=&MYCLASS` inside a PROC is not checked and gets no warning.
- **E** — An empty value (`CLASS=`) gets `JCLS009` instead of a crash.
- **S** — Nick's item 12 example gets a `JCLS009` on `TYPE` once feature 17 adds the NOTIFY rules.

**Done when:** Value rules are declared as data, a wrong value gets `JCLS009` with the allowed values, and the existing value checks still pass.

### 15. MSGLEVEL values

**What it does:** Checks MSGLEVEL properly: at most two sub-parameters, statements 0–2 and messages 0–1.

**From the feedback:** Item 6, "MSGLEVEL only supports 2 sub-parameters (0-2, 0-1). The tool allows as many sub-parameters as you want, also invalid values".

**How it works**
- A `list` rule from feature 14: up to 2 positions. Position 1 is `integer` 0–2 (statements) and position 2 is `integer` 0–1 (messages). Either can be left out: `MSGLEVEL=1`, `MSGLEVEL=(,0)` and `MSGLEVEL=(2,1)` are all valid.
- Too many sub-parameters, or a value outside its range, gets `JCLS009`.

**Tests**
- **Z** — A JOB statement with no MSGLEVEL gets no MSGLEVEL diagnostic.
- **O** — `MSGLEVEL=(1,1)` is accepted.
- **M** — `MSGLEVEL=1`, `MSGLEVEL=(2)`, `MSGLEVEL=(,0)` and `MSGLEVEL=(0,1)` are all accepted.
- **B** — `MSGLEVEL=(2,1)` is accepted. `MSGLEVEL=(3,1)` and `MSGLEVEL=(2,2)` are rejected.
- **B** — Two sub-parameters are accepted, and `MSGLEVEL=(1,1,1)` is rejected.
- **I** — The message says which sub-parameter is wrong ("messages must be 0 or 1; found 2").
- **E** — `MSGLEVEL=()`, `MSGLEVEL=(A,B)` and `MSGLEVEL=(1,1` get clear diagnostics, and none of them crash.
- **S** — A user types `MSGLEVEL=(1,1,1,5)`, sees one warning explaining the two allowed sub-parameters, fixes it, and it checks clean.

**Done when:** Only the valid MSGLEVEL forms are accepted, and each invalid form gets one clear `JCLS009`.

### 16. NOTIFY= on the JOB statement

**What it does:** Checks that `NOTIFY=` on the JOB statement is `&SYSUID` or a valid TSO user ID.

**From the feedback:** Item 7, "NOTIFY= - only 1 - 8 characters - has to be valid TSO userid".

```
//RARE JOB NOTIFY=IBMUSERRRRRRRR
//RARE JOB NOTIFY=laskdjasd1.&SYSUID
//RARE JOB NOTIFY=N1.IBMUSER
```

**How it works**
- A `oneOf` rule: `&SYSUID`, or a `name` of 1–8 characters that starts with a letter or national character and continues with letters, digits or national characters.
- The 1–8 length comes from Nick's note. Two things still need confirming before the rule is final (see feature 41): whether the JCL reference sets TSO/E user IDs at 7 characters, and whether the `node.userid` form (`N1.IBMUSER`) is valid.
- Lower-case letters are accepted, since JCL treats them as upper case in this field. (Confirm in feature 41.)
- A wrong value gets `JCLS009`, explaining the user ID rules.

**Tests**
- **Z** — A JOB statement without NOTIFY gets no NOTIFY diagnostic.
- **O** — `NOTIFY=&SYSUID` and `NOTIFY=IBMUSER` are accepted.
- **B** — A user ID of 8 characters is accepted, and one of 9 is rejected.
- **M** — All three of Nick's item 7 examples give the results agreed in feature 41. At minimum, `IBMUSERRRRRRRR` and `laskdjasd1.&SYSUID` are rejected.
- **I** — The warning points to the NOTIFY value and gives the length and character rules.
- **E** — `NOTIFY=1BMUSER` (starts with a digit) and `NOTIFY=` (empty) are rejected without a crash.
- **S** — A user copies a job with `NOTIFY=&SYSUID` and sees no warning.

**Done when:** Nick's item 7 examples give the results confirmed in feature 41, and `NOTIFY=&SYSUID` is always accepted.

### 17. NOTIFY statement and EMAIL

**What it does:** Checks the parameters of the NOTIFY statement and the `EMAIL=` parameter of the JOB statement. Today the NOTIFY statement is passed through without any checks.

**From the feedback:** Item 12 (above), item 10 (EMAIL on JOB), and item 14, which uses both:

```
//RARE JOB MSGLEVEL=(1,1),EMAIL='nick-becker@themagicmainframe.com'
//N1   NOTIFY EMAIL='nick-becker@themagicmainframe.com',TYPE=TSO
```

**How it works**
- NOTIFY gets its own keyword table: `EMAIL`, `USER`, `TYPE` and `WHEN`, each with a value rule and a `since` level from feature 3.
- The rules are taken from the reference:
  - `EMAIL` is a quoted address of up to 246 characters with one `@`.
  - `USER` follows the user ID rule from feature 16.
  - `TYPE` is a fixed list.
  - `WHEN` is a condition.
  - `EMAIL` and `USER` can't both be used.
  - One of `EMAIL` or `USER` is required.
- The exact `TYPE` values are confirmed against the reference in feature 41, because Nick's item 14 uses `TYPE=TSO` and the item 12 example is invalid.
- `EMAIL=` is added to the JOB keyword table (`since: '2.3'`), using the same address rule.
- NOTIFY placement: after the JOB statement and before the first EXEC, with the limit on how many are allowed taken from the reference. A misplaced NOTIFY gets an ordering error (`JCLO009`); more than 8 in a job gets `JCLO010`. Both EMAIL and USER on one statement gets `JCLK007`.

**Tests**
- **Z** — A NOTIFY statement with no parameters gets `JCLK002`, asking for EMAIL or USER.
- **O** — `//N1 NOTIFY USER=IBMUSER` is accepted.
- **M** — A job with several NOTIFY statements, mixing EMAIL and USER, is accepted up to the limit.
- **B** — An EMAIL value at the maximum length is accepted, and one character longer is rejected.
- **I** — Nick's item 12 example gets `JCLS009` on `TYPE`, listing the allowed values.
- **E** — `EMAIL='nick'` (no `@`) and an unquoted address are rejected with clear fixes.
- **E** — A NOTIFY with both EMAIL and USER gets a conflict error.
- **E** — A NOTIFY after the first EXEC gets an ordering error.
- **S** — Nick's item 14 example has no NOTIFY or EMAIL diagnostics, unless feature 41 finds that `TYPE=TSO` is not allowed.

**Done when:** NOTIFY statements and `EMAIL=` on the JOB statement are fully checked, and Nick's item 12 example gets a warning on its TYPE value.

### 18. Keywords qualified with a procedure step

**What it does:** Accepts EXEC keywords qualified with a procedure step, such as `COND.PAID=` and `REGION.S1=`, on a step that calls a procedure.

*Found while reviewing:* in Nick's item 2 example, `COND.PAID`, `COND.LATE` and `COND.BILL` each get `JCLK001` (unknown keyword), and `REGION.S1=4M` does too.

**How it works**
- `keyword.procstep=value` is split into a keyword and a procedure step name. The keyword is checked against the EXEC table, and its value is checked as usual.
- Only keywords that can apply to a procedure step can be qualified (for example `COND`, `REGION`, `TIME`, `PARM`, `ACCT`, `ADDRSPC`, `DPRTY`, `PERFORM`, `RD`). `PGM.S1=` is rejected.
- The procedure step name must be a valid name (1–8 characters). When the procedure is in-stream, the step must exist in it, otherwise a `JCLR` error is raised: "PROC MYPROC has no step 'S9'." When the procedure is catalogued, the step can't be checked, so nothing is reported.
- A qualified keyword on an EXEC with `PGM=` is an error, since there is no procedure step to apply it to.

**Tests**
- **Z** — An EXEC with no qualified keywords is checked as today.
- **O** — `REGION.S1=4M` on a call to an in-stream PROC that has step S1 is accepted.
- **M** — Nick's item 2 example gets no `JCLK001` for any of the three COND overrides.
- **B** — A procedure step name of 8 characters is accepted, and one of 9 is rejected.
- **I** — An unknown step in an in-stream PROC gets a `JCLR` error that names the PROC and lists its steps.
- **E** — `PGM.S1=X` and `COND.S1=` on an `EXEC PGM=` step are rejected with clear messages.
- **E** — A misspelled keyword (`REGON.S1=4M`) still gets "Did you mean 'REGION'?".
- **S** — A user overrides REGION and COND for two steps of an in-stream PROC, and the job checks clean.

**Done when:** Keywords qualified with a procedure step are accepted and checked, and Nick's item 2 example has no keyword warnings.

---

## DD statements

### 19. Member names and other dataset name forms

**What it does:** Accepts every common way of writing a dataset name: a library member, a generation, a temporary dataset and a quoted name.

**From the feedback:** Item 13, "This a valid DD statement, gives a warning about the qualifier being longer than 8 characters".

```
//SYSUT1 DD DSN=NICK.BECKER(MYJOB),DISP=SHR
```

The member name in brackets is counted as part of the last qualifier (`BECKER(MYJOB)`).

**How it works**
- `checkDsn` separates a trailing bracketed part before checking qualifiers:
  - `(member)` is 1–8 characters and starts with a letter or national character.
  - `(+n)`, `(-n)` and `(0)` are generation references, which are already handled.
- The 44-character limit applies to the name without the member or generation part.
- Temporary datasets (`&&TEMP`, `&&TEMP(MEM)`) follow the temporary name rules (1–8 characters after `&&`) instead of being skipped as symbolic parameters.
- A quoted name (`DSN='ODD.NAME'`) skips the qualifier checks, as the reference allows, with an `info` note (`JCLS014`).
- A new warning, `JCLS010`, covers an invalid member name.

**Tests**
- **Z** — A DSN with no bracketed part is checked exactly as today.
- **O** — Nick's item 13 example gives no diagnostics.
- **M** — `A.B(MEM)`, `A.B(+1)`, `A.B(0)`, `&&TEMP` and `&&TEMP(MEM)` are all accepted.
- **B** — A member of 8 characters is accepted, and one of 9 gets `JCLS010`. A name of exactly 44 characters plus a member is accepted.
- **I** — `JCLS010` names the member and the rule it breaks.
- **E** — `A.B()`, `A.B(1MEM)`, `A.B(MEM` and `&&` get clear diagnostics without a crash.
- **S** — A user points SYSUT1 at a PDS member and the job checks clean.

**Done when:** Nick's item 13 example checks clean, and member, generation and temporary names follow their own rules.

### 20. Duplicate DD names

**What it does:** Reports duplicate DD names in a step as a warning instead of an error, because the JCL is valid and z/OS only uses one of them.

**From the feedback:** Item 18, "This is valid JCL - the last defined DD is used".

```
//SYSUT2   DD SYSOUT=*
//SYSUT2   DD SYSOUT=A
```

**How it works**
- `JCLD001` becomes a warning. Its message explains what z/OS does with both DDs, so the user understands why a program may not see the DD they expect.
- Nick says the last DD is used. The JCL reference describes both DDs being allocated, with references going to the first. Which one the message names is confirmed in feature 41 before the wording is final.
- Unnamed DDs in a concatenation are not affected.
- Because `JCLD001` is now a warning, a job whose only problem is a duplicate DD counts as valid.

**Tests**
- **Z** — A step with no DDs gets no `JCLD001`.
- **O** — Nick's item 18 example gets one `JCLD001` warning, and `valid` is true.
- **M** — Three DDs with the same name give two warnings, one for each repeat.
- **B** — The same DD name in two different steps gives no warning.
- **I** — The warning is shown with warning styling in the diagnostics panel, and the error count in the header doesn't include it.
- **E** — Names that differ only in case (`sysut2` and `SYSUT2`) are treated as the same name.
- **S** — A user who overrides a DD by repeating it sees a warning that explains which one is used, and the job is still reported as clean of errors.

**Done when:** Nick's item 18 example is valid with one warning whose wording has been confirmed.

### 21. DD data sources, including PATH

**What it does:** Supports z/OS UNIX files on DD statements, and stops reporting a missing data source on DDs that are valid without one.

**From the feedback:** Item 19, "It would be nice if PATH and friends were supported on DD statements".

```
//DD1  DD  PATH='/usr/applics/pay.time',PATHOPTS=ORDONLY
```

*Found while reviewing:* `JCLD002` (missing data source) is wrongly reported on several valid DDs: a temporary dataset with no DSN (`//T DD UNIT=SYSDA,SPACE=(TRK,1)`), `SUBSYS=` and `DDNAME=`.

**How it works**
- New DD keywords, each with value rules:
  - `PATH`: an absolute path of up to 255 characters, quoted if it contains special characters.
  - `PATHOPTS`: a list from ORDONLY, OWRONLY, ORDWR, OAPPEND, OCREAT, OEXCL, ONOCTTY, ONONBLOCK, OSYNC and OTRUNC.
  - `PATHMODE`: a list of permission names such as SIRUSR and SIWUSR.
  - `PATHDISP`: up to two of KEEP or DELETE.
  - `FILEDATA`: BINARY, TEXT or RECORD.
- `PATH`, `SUBSYS` and `DDNAME` count as data sources. A DD with `SPACE=` and no DSN counts as a new temporary dataset.
- New conflicts:
  - `PATH` with `DSN`, `SYSOUT` or `DUMMY`.
  - `DISP` with `PATH` (use `PATHDISP`).
  - Path options without `PATH`.
- At most one of only-read, only-write or read-write can be chosen in `PATHOPTS`.

**Tests**
- **Z** — A DD with no data source and no SPACE still gets `JCLD002`.
- **O** — Nick's item 19 example gives no diagnostics.
- **M** — `PATH` with `PATHOPTS=(OWRONLY,OCREAT,OTRUNC)`, `PATHMODE=(SIRUSR,SIWUSR)`, `PATHDISP=(KEEP,DELETE)` and `FILEDATA=TEXT` together are accepted.
- **B** — A path of 255 characters is accepted, and one of 256 is rejected. A relative path (`pay.time`) is rejected.
- **I** — `PATH` with `DSN` gets `JCLD003`, naming both.
- **E** — `PATHOPTS=(ORDONLY,OWRONLY)` and `PATHOPTS=ORDONLY` without `PATH` get clear diagnostics.
- **E** — `//T DD UNIT=SYSDA,SPACE=(TRK,1)`, `//T DD SUBSYS=(BLSR,DDNAME=X)` and `//T DD DDNAME=SYSIN` no longer get `JCLD002`.
- **S** — A user writes a BPXBATCH step with STDOUT and STDERR going to UNIX files, and it checks clean.

**Done when:** Nick's item 19 example checks clean, and none of the valid DDs found while reviewing gets `JCLD002`.

### 22. Job groups (JOBGROUP)

**What it does:** Supports JES2 job groups, which define a set of jobs and the order they run in.

**From the feedback:** Item 5, "No JOBGROUP support, sad face".

```
//MULTI    JOBGROUP
//A        GJOB
//B        GJOB
//           AFTER NAME=A,
//            WHEN=(RC=0)
//C        GJOB
//           AFTER NAME=A,
//            WHEN=(RC=4)
//D        GJOB
//           AFTER NAME=B
//           AFTER NAME=C
//MULTI    ENDGROUP
```

Today this gives 11 errors.

**How it works**
- Builds on feature 10, because a job group sits in a job stream next to ordinary jobs.
- New statements: `JOBGROUP`, `ENDGROUP`, `GJOB`, `JOBSET`, `SJOB`, `ENDSET`, `AFTER`, `BEFORE` and `CONCURRENT`, each with its keyword table from the JES2 job group section of the reference. The `SCHEDULE` statement's `JOBGROUP=` keyword, which a real job uses to join the group, is recognised too.
- A job group node holds its jobs, its job sets and their dependencies. Structure checks:
  - `ENDGROUP` has the same name as its `JOBGROUP`.
  - A job set is closed by `ENDSET`.
  - Job names are unique within the group.
  - `AFTER`, `BEFORE` and `CONCURRENT` come after a `GJOB` or `SJOB`.
  - `NAME=` refers to a job defined in the group.
- `WHEN=` conditions are checked for syntax (`RC`, `ABEND` and similar comparisons).
- Dependency cycles (A after B, B after A) are reported, and the message names the loop.
- New code group `JCLGxxx`.

**Tests**
- **Z** — A job stream with no job group is checked exactly as before.
- **O** — A group with one `GJOB` and a matching `ENDGROUP` gives no diagnostics.
- **M** — Nick's item 5 example gives no diagnostics.
- **B** — Job names of 8 characters are accepted, and 9 are rejected.
- **I** — An `AFTER NAME=Z`, where Z isn't in the group, gets a `JCLG` error on that line that lists the group's jobs.
- **E** — `ENDGROUP` with a different name, a missing `ENDGROUP`, or an `AFTER` before any `GJOB` gets a clear error.
- **E** — A cycle A → B → C → A is reported once, naming all three jobs.
- **S** — A user defines a four-job group, then a job that joins it with `SCHEDULE JOBGROUP=MULTI`, and everything checks clean.

**Done when:** Nick's item 5 example checks clean, and unknown names, mismatched names and dependency cycles are reported.

---

## Procedures and includes

### 23. Catalogued PROCs and INCLUDE members

**What it does:** Lets the user supply the catalogued procedures and INCLUDE members their job uses, so the tool can check them instead of only warning that it can't see them.

*From Spec.md:* "Checking catalogued PROCs supplied by the user, and processing INCLUDE members."

**How it works**
- Builds on:
  - feature 10 (each job is checked on its own)
  - feature 11 (the JCLLIB search order)
  - feature 18 (keywords qualified with a procedure step)
  - feature 19 (member names)
- The workbench gets a **Library** panel next to the editor. The user adds members, each with a library and member name (for example `CAMPBEL.PROCS.JCL(MYPROC2)`) and its text. A member can be left without a library, in which case it stands for the system procedure library. The panel reuses the `Editor.vue` component, so line numbers and gutter markers work there too.
- `POST /api/validate` accepts an optional `library` list of `{ dsn, member, source }`. The whole request stays within the existing 2 MB limit, with at most 50 members.
- PROC calls:
  - An `EXEC PROC=` call that isn't in-stream is looked up in the JCLLIB `ORDER=` libraries in order, then in members with no library.
  - A procedure that is found is parsed and checked like an in-stream PROC: symbolic parameters, DD overrides and step-qualified keywords.
  - PEND is optional in a catalogued procedure.
- INCLUDE:
  - `INCLUDE MEMBER=name` is replaced by the member's statements before parsing, using the same search order.
  - Members can include other members, up to a nesting limit. A member that includes itself, directly or through others, is reported as a loop.
  - Statements the reference doesn't allow in an INCLUDE group (such as JOB, PROC, PEND and JCLLIB) are reported.
- Diagnostics found inside a member gain a `member` field (for example `CAMPBEL.PROCS.JCL(MYPROC2)`). The panel shows them as `MYPROC2 L3:5`, and clicking one opens that member at that line.
- A PROC or INCLUDE that still can't be found stays a warning (`JCLR001`, plus a new warning for INCLUDE). The fix now says it can be added in the Library panel.

**Tests**
- **Z** — With an empty library, results are exactly as today, and unresolved calls still get `JCLR001`.
- **O** — A job calling `MYPROC2`, with `MYPROC2` in the library, gives no `JCLR001`, and a mistake inside `MYPROC2` is reported against the member.
- **M** — With the same member name in two JCLLIB libraries, the one that comes first in `ORDER=` is used.
- **M** — A job that includes two members, one of which includes a third, is checked as if all the statements were written in place.
- **B** — 50 library members are accepted, and 51 get a 400 response. Nesting at the limit is accepted, and one level deeper is rejected.
- **I** — A diagnostic inside a member carries its `member` field and the line within that member, not the line in the job.
- **E** — A member that includes itself gets one loop diagnostic, and validation still finishes.
- **E** — An INCLUDE member containing a JOB statement gets a clear diagnostic.
- **E** — A library entry with an invalid library or member name is rejected with a message naming the entry.
- **S** — A user pastes Nick's item 17 job with the JCLLIB moved into place, adds `MYPROC2` to the Library panel, and sees its steps checked along with the job.

**Done when:** Catalogued procedures and INCLUDE members supplied by the user are found in the JCLLIB order and checked, and their diagnostics point to the right member and line.

---

## Workbench

### 24. Cursor line and column

**What it does:** Shows the line and column the cursor is on, which matters in a language where columns 3, 11, 16, 71 and 72 have meaning.

**From the feedback:** Item 1, "What is the meaning of the 'COL 1' on the source line, next to the number of lines indicator? It never seems to change".

The text is fixed in `Editor.vue` (`{{ lineCount }} LINES · COL 1`).

**How it works**
- `Editor.vue` follows the textarea's cursor, using its selection start, on input, click, key up and select events. It works out the line and column, both counted from 1, and the bar shows `LN 4 · COL 16 · 12 LINES`.
- When text is selected, it shows the number of selected characters (`SEL 24`).
- Column 72 and above is highlighted in the indicator (for example COL 72 in amber), as a reminder that the column has a special meaning.
- The indicator is announced politely to screen readers only when the user asks (it is not live on every key press).

**Tests**
- **Z** — With an empty editor, the bar shows `LN 1 · COL 1 · 1 LINES`.
- **O** — Clicking just after the `//` on line 1 shows `COL 3`.
- **M** — Moving with the arrow keys, Home, End and clicks updates the indicator each time.
- **B** — The cursor at the end of an 80-character line shows `COL 81`. The cursor before the last character shows `COL 80`.
- **B** — Columns 71 and 72 show differently in the indicator.
- **I** — Selecting 24 characters shows `SEL 24`, and clearing the selection hides it.
- **E** — Pasting text with Windows line endings (`\r\n`) still gives the right line and column.
- **S** — A user checks that their continued quote starts in column 16 by placing the cursor on it.

**Done when:** The indicator always shows the cursor's real line and column, and "COL 1" never sticks.

### 25. Syntax highlighting

**What it does:** Colours the parts of each JCL line in the editor, and underlines the exact text each diagnostic points to.

**From the feedback:** Item 9, "Is there supposed to be syntax highlighting when using the web-based tool?"

**How it works**
- A highlighted copy of the text is drawn in a layer behind a transparent textarea. Both use the same font, size, padding and scrolling, so typing, selection and undo stay native and no editor library is needed.
- A small client-side tokeniser colours each line:
  - the name field
  - the operation
  - keyword names
  - values
  - quoted strings
  - comments (`//*` and trailing comments)
  - in-stream data
  - JES2 statements
  - columns 73–80 (dimmed)
- It runs on every keystroke, independently of the API.
- Diagnostics from the API underline their `column` and `length` in the severity colour. Hovering over an underline shows the message, as the gutter dot does today.
- A faint ruler marks columns 72 and 80.
- The colours come from the workbench theme in `style.css`, and each meets the contrast ratio against the editor background.

**Tests**
- **Z** — An empty editor shows no highlighting and no errors in the browser console.
- **O** — `//STEP1 EXEC PGM=IEFBR14` shows the name, operation, keyword and value in four different colours.
- **M** — All three samples are highlighted correctly, including continuations, comments and in-stream data.
- **B** — Text in column 72 and columns 73–80 is styled differently from columns 1–71.
- **I** — Each diagnostic's underline starts at its column and covers its length. The text, cursor and highlight stay exactly aligned after scrolling sideways and down.
- **E** — A 2,000-line job types without visible lag, and a line with an unclosed quote doesn't colour the rest of the file.
- **E** — When the API is unreachable, highlighting still works and only the underlines are missing.
- **S** — A user pastes the broken sample, sees each mistake underlined, and hovers over one to read the fix.

**Done when:** The editor colours JCL as it is typed, with no lag or misalignment, and every diagnostic underlines its exact text.

### 26. Keyboard shortcuts

**What it does:** Makes the F1, F5, F9 and F12 keys work in every major browser, as the PF-key bar suggests they do.

**From the feedback:** Item 20, "Keyboard shortcuts F1, F5, F9, F12 don't seem to work in Firefox".

Today the PF keys are only buttons. Nothing listens for the keys in any browser.

**How it works**
- `Workbench.vue` adds a `keydown` listener while the workbench is open and removes it when the user leaves.
  - F1 opens help, F5 validates, F9 loads the next sample and F12 clears the editor.
  - Each key's browser default (help, reload, developer tools) is cancelled where the browser allows it.
  - Escape closes help.
- F12 may still open developer tools in some browsers, and on Macs the F keys need Fn. Each action therefore also has a fallback: Ctrl/Cmd+Enter validates, and Alt+H, Alt+S and Alt+C open help, load a sample and clear. Both are shown in each PF button's tooltip and in help.
- Because F9 and F12 now fire from the keyboard, replacing the user's own text shows an "Undo" notice for 5 seconds that brings the old text back.
- The keys are ignored while the help modal is open, apart from Escape and F1.

**Tests**
- **Z** — With an empty editor, F12 does nothing and no Undo notice appears.
- **O** — Pressing F5 in Firefox validates straight away and doesn't reload the page.
- **M** — F1, F5, F9 and F12 work in current Firefox, Chrome, Safari and Edge, with the result noted for each browser.
- **B** — Pressing F9 three times cycles through all three samples and returns to the first.
- **I** — Each PF button's tooltip shows its F key and its fallback shortcut.
- **E** — Where a browser won't release F12, the fallback shortcut still clears the editor.
- **E** — Undo after F12 restores the text exactly, and the notice disappears after 5 seconds.
- **S** — A user writes a job, presses F5 to check it, F1 to read about an error, Escape to close help, and fixes the error, all without the mouse.

**Done when:** The four F keys work in Firefox, Chrome, Safari and Edge, every action has a fallback shortcut, and no keyboard action can lose the user's text without a way to undo it.

### 27. z/OS level and JES picker

**What it does:** Lets the user choose, from the workbench header, the z/OS level to check against and whether the system runs JES2 or JES3.

**From the feedback:** Item 11, "It would be nice if there was a way to pick what level of z/OS is being used to check the syntax".

**How it works**
- A dropdown in the workbench header ("z/OS 3.2 ▾") lists the levels from feature 3.
- The levels are loaded from a new `GET /api/levels` endpoint, so the frontend never keeps its own copy. Each level says whether it offers JES3.
- Next to it, a JES2/JES3 switch (feature 9). JES3 is only offered at z/OS 2.5 and earlier. Choosing 3.1 or later while JES3 is selected switches back to JES2, with a short notice explaining that IBM removed JES3 in 3.1.
- The chosen level and JES are sent as `zosLevel` and `jes` with every validation, and changing either checks the JCL again straight away.
- The choices are saved in `localStorage` (wrapped in try/catch) so they are remembered on the next visit. They are also kept in the URL (`/app?zos=2.5&jes=JES3`) so a shared link checks the same way.
- The diagnostics panel shows the level and JES the result was checked against, taken from the API response.

**Tests**
- **Z** — On a first visit with nothing stored, the newest level is selected.
- **O** — Choosing 2.2 or older isn't possible. Choosing 2.3 checks Nick's item 10 example cleanly.
- **M** — Switching between three levels re-checks the JCL each time, and the results change only for keywords whose availability differs.
- **B** — The oldest and newest levels can both be chosen and both give results.
- **B** — JES3 can be chosen at 2.5. At 3.1 the switch is disabled, and moving from 2.5 with JES3 to 3.1 switches back to JES2 with the notice.
- **I** — The panel's "checked against z/OS N, JES2" always matches the dropdown and the switch.
- **E** — An unknown `?zos=` value in the URL falls back to the newest level with a short notice, and `?jes=JES3` with a 3.x level falls back to JES2 the same way.
- **E** — With browser storage blocked, the picker still works for the visit.
- **S** — A user on an older shop's release picks it, sees that `EMAIL=` isn't available, and reads why.

**Done when:** The user can pick a z/OS level and JES, JES3 is only offered where IBM still ships it, every result shows what it was checked against, and a shared link keeps both.

### 28. Remembering JCL between visits

**What it does:** Keeps the user's JCL, library members and z/OS level in their own browser, so closing the tab doesn't lose their work.

*From Spec.md:* "Remembering the user's JCL in the browser between visits."

**How it works**
- The editor text and the Library panel members (feature 23) are saved to `localStorage` half a second after the user stops typing. Feature 27 already saves the level and JES.
- On the next visit, the saved draft is loaded. On a first visit, the clean sample is shown as today.
- Every storage read and write is wrapped in try/catch. If storage is blocked or full, the workbench still works for the visit and shows a one-line notice that the draft isn't being saved.
- Loading a sample (F9) or clearing (F12) changes the draft too. The Undo notice from feature 26 brings the old draft back.
- The draft stays in the browser and is never sent anywhere except to the API for checking. The privacy line in Spec.md and on the site is updated in feature 30.
- When the workbench is open in two tabs, the last change wins. Tabs are not kept in sync.

**Tests**
- **Z** — With nothing saved, the clean sample is shown.
- **Z** — Clearing the editor and reloading shows an empty editor, not the sample.
- **O** — Typing a job and reloading the page shows the same job.
- **M** — A job and three library members all come back after closing and reopening the browser.
- **B** — A change made just before reloading, after the half-second wait has passed, is kept.
- **I** — The notice about the draft not being saved appears only when storage fails, and only once per visit.
- **E** — With storage blocked, the workbench loads the sample, checks JCL as normal and shows the notice.
- **E** — A corrupted saved draft is ignored and the sample is shown, with no error.
- **S** — A user writes half a job, closes the laptop, comes back the next day and carries on where they left off.

**Done when:** A user's JCL, library members and level survive a reload and a browser restart, and the workbench still works when storage is unavailable.

### 29. Shareable links

**What it does:** Creates a link that opens the workbench with the same JCL, library members and z/OS level, so a learner can send a problem to a colleague or mentor.

*From Spec.md:* "Shareable links to a piece of JCL."

**How it works**
- A **Share** action is added to the PF-key bar as F6 SHARE, with Alt+L as its fallback, using the key handling from feature 26.
- Share puts the JCL, the library members, the level and the JES into the part of the address after `#`, compressed with the browser's built-in `CompressionStream` and encoded in base64url. For example: `/app?zos=3.1#jcl=…`.
  - Nothing is stored on a server. The `#` part is never sent to the server, so the privacy promise in Spec.md still holds.
  - The link is copied to the clipboard. If the clipboard is blocked, it is shown in a field to copy by hand.
- Opening a shared link loads its JCL into the editor and checks it straight away. The user's saved draft (feature 28) is kept, and a notice offers "Back to my draft". The draft is only replaced once the user edits the shared JCL.
- Links longer than 32 KB are refused with a message, because chat apps and email often cut long links short.
- The page's canonical address stays `/app`, so shared links are never indexed as separate pages.

**Tests**
- **Z** — Sharing an empty editor is refused with a short message.
- **O** — Sharing a job and opening the link in a private window shows the same job, checked.
- **M** — A link with a job, two library members, level 2.5 and JES3 opens with all four restored.
- **B** — A link just under 32 KB is created, and one just over is refused.
- **I** — The link opens at `/app` with the same diagnostics as the original, and the canonical tag is still `/app`.
- **E** — A damaged or cut-off link shows "This link is incomplete or damaged" and leaves the user's draft alone.
- **E** — With the clipboard blocked, the link is shown in a field to copy by hand.
- **E** — Opening a link and then choosing "Back to my draft" restores the draft exactly.
- **S** — A trainee shares a failing job with a mentor, who opens the link, sees the same errors and sends back a fixed link.

**Done when:** A shared link reproduces the JCL, library, level and JES exactly in another browser, and stores nothing on a server.

---

## Site and docs

### 30. Accurate copy, help and docs

**What it does:** Makes the site, help, README and Spec describe what the tool actually does after features 1–29.

**From the feedback:** Item 10 asks which level of the reference is used. Separately, the landing page says the tool "Runs entirely in your browser + a Node API", and the first FAQ answer says checks happen "right in your browser", but JCL is in fact sent to the API.

**How it works**
- The landing page trust line and the first FAQ answer say that JCL is sent to the JCLcheck API to be checked and is not stored on the server. The Privacy line in Spec.md and the site say the draft is kept only in the user's own browser (feature 28), and that a shared link carries the JCL inside the link itself (feature 29).
- Help (`HelpModal.vue`) gains:
  - the z/OS levels supported and the default, and that JES3 is only checked at 2.5 and earlier
  - the column rules (feature 4)
  - the keyboard shortcuts and fallbacks (feature 26), including F6 SHARE (feature 29)
  - how to use the Library panel (feature 23)
  - every new code group (`JCLJ`, `JCLG`, `JCLC`) and code (`JCLD004`–`JCLD007`, `JCLK004`–`JCLK009`, `JCLR004`–`JCLR008`, `JCLL004`–`JCLL006`, `JCLO005`–`JCLO010`, `JCLS009`–`JCLS014`)
- The "Limitations" sections in help, the README and `Spec.md` drop anything features 4–23 have fixed, such as the loose handling of continuation columns and catalogued procedures that can't be checked.
- The README documents the API changes: `zosLevel`, `jes`, `library`, the `member` field on diagnostics, `ast.jobs`, `jobCount` and `GET /api/levels`.
- A short "Thanks" line on the About page credits the review that shaped these features, if Nick agrees.

**Tests**
- **Z** — No page or document still says the check runs only in the browser.
- **O** — The help modal names the default z/OS level.
- **M** — Every diagnostic code in `errors.js` appears in help, and help lists no code that doesn't exist. This is checked by a test that compares the two.
- **I** — The README's example request and response match what the API actually returns.
- **E** — The FAQ's structured data (in `router.js`) matches the visible FAQ text.
- **S** — A new user reads help, learns which z/OS level and which columns apply, and finds every code they meet in the panel explained there.

**Done when:** Help, the landing page, the README and Spec.md match the shipped behaviour, and a test keeps the help's code list in step with `errors.js`.

## Fixes found in code review

These come from reading the code and running small jobs through `validate()`, not from Nick's review. Each one is a false error, a missed error or a wrong location in today's tool.

### 31. DSN with LIKE

**What it does:** Stops treating `LIKE=` as a data source, so a new dataset modelled on an existing one is no longer rejected.

*Found in code review:*

```
//NEW  DD  DSN=MY.NEW.FILE,LIKE=MY.MODEL.FILE,DISP=(NEW,CATLG)
```

Today this gets `JCLD003` as an error: "combines mutually exclusive parameters ('DSN' and 'LIKE')". `LIKE` only copies attributes such as RECFM, LRECL and SPACE from a model dataset, and it is normally coded with `DSN=`.

**How it works**
- `checkDataSource` in `ddRules.js` no longer adds `LIKE` to the list of data sources.
- A DD with `LIKE=` and no DSN counts as a new temporary dataset, in the same way feature 21 treats a DD with `SPACE=` and no DSN.
- `LIKE` with `SYSOUT`, `*` or `DATA` gets `JCLD003` naming the other parameter, since a model's attributes can't apply to them. (Confirm in feature 41.)
- The `LIKE` value is checked with the same dataset name rules as DSN (feature 19), without a member or generation.
- The unused `hasReferBack` variable in the same function is removed.

**Tests**
- **Z** — A DD with no DSN, no LIKE and no other source still gets `JCLD002`.
- **O** — The example above gives no diagnostics.
- **M** — `DSN=`, `LIKE=`, `DISP=(NEW,CATLG)`, `UNIT=SYSDA` and `SPACE=(CYL,(1,1))` together give no diagnostics, in any order.
- **I** — `LIKE=A.B,SYSOUT=*` gets `JCLD003` naming `LIKE` and `SYSOUT`.
- **E** — `LIKE=` with no value gets `JCLS006` instead of a crash.
- **S** — A user allocates a new copy of a production file with LIKE, and the job checks clean.

**Done when:** `DSN=` with `LIKE=` checks clean, and LIKE is checked as a dataset name instead of as a data source.

### 32. Symbols in in-stream PROCs

**What it does:** Stops reporting temporary datasets, `&SYSUID`, SET symbols and symbols supplied by the calling EXEC as undefined symbolic parameters.

*Found in code review:*

```
//J1   JOB (A),'X'
//     SET HLQ=PROD
//P    PROC
//S1   EXEC PGM=SORT
//W    DD DSN=&&WORK,DISP=(NEW,PASS),SPACE=(TRK,1)
//D    DD DSN=&SYSUID..DATA,DISP=SHR
//E    DD DSN=&HLQ..&ENV..DATA,DISP=SHR
//     PEND
//S    EXEC P,ENV=TEST
```

Today lines 5–7 get `JCLR002` as errors: 'WORK', 'SYSUID', 'HLQ' and 'ENV' are each "not defined in procedure 'P'". The EXEC on line 9 also gets `JCLK001`, because `ENV` has no default on the PROC statement. Feature 19 fixes `&&TEMP` in the DSN value check, but this is a separate scan in `procRules.js`, so the false errors would remain.

**How it works**
- The symbol scan in `procRules.js` skips `&&name`. A temporary dataset name is never a symbol.
- `&SYSUID` and the other JCL system symbols available at the chosen z/OS level (feature 3) are always defined. The list lives in `keywords.js`.
- PROCs are checked call by call. For each EXEC that calls an in-stream PROC, a symbol is defined if it has a default on the PROC statement, is set by a SET statement earlier in the job, or is given on that EXEC.
- `JCLR002` is raised only when none of these defines the symbol. The message names the calling step: "Symbolic parameter 'ENV' is not defined in procedure 'P' when called by step 'S'."
- A PROC that is never called keeps today's check against its own defaults.
- On an EXEC that calls an in-stream PROC, any symbol used in the PROC body is accepted as a keyword, not only those with defaults. Anything else still gets `JCLK001`, now worded "'XYZ' is not an EXEC keyword or a symbolic parameter of procedure 'P'."
- Catalogued PROCs from feature 23 use the same check.

**Tests**
- **Z** — A PROC that uses no symbols gives no `JCLR002`.
- **O** — `DSN=&&WORK` in a PROC body gives no `JCLR002`.
- **M** — The example above gives no diagnostics.
- **M** — The same PROC called twice, once with `ENV=TEST` and once without, gets one `JCLR002`, naming the second step.
- **B** — A SET on the line before the calling EXEC defines the symbol. A SET after the calling EXEC does not.
- **I** — `JCLR002` points to the symbol in the PROC body and names the calling step.
- **E** — `&&` on its own, and `&` at the end of a value, give a clear diagnostic or none, with no crash.
- **S** — A user copies a production PROC that writes to `&SYSUID..` datasets and passes `ENV=` on the EXEC, and it checks clean.

**Done when:** Temporary datasets, system symbols, SET symbols and EXEC overrides never get `JCLR002` or `JCLK001`, and a symbol that really is undefined still does.

### 33. Positions on continued statements

**What it does:** Makes every diagnostic on a continued statement point to the physical line and column where the problem actually is.

*Found in code review:*

```
//J1   JOB (A),'X'
//S1   EXEC PGM=IEFBR14
//DD1  DD DSN=MY.FILE,
//         DISP=SHR,
//         SPACE=(FOO,(1,1))
```

Today the bad SPACE on line 5 is reported at line 3, column 37, a column that doesn't exist on that 22-character line. The lexer joins continued lines into one operand string, and the tokeniser works out columns as offsets into that string. The rules then report the statement's first line, while parser errors use its last line. Clicking the diagnostic goes to the wrong line, and feature 25 would underline the wrong text.

Although it is numbered after the review features, build this after feature 4 and before feature 25, since underlines rely on exact positions.

**How it works**
- When the lexer joins a continuation, it records where each piece came from: its offset in the joined operand, its physical line and its starting column.
- `tokenizeParams` uses that map to give each parameter and value its own `line` and `column`, and a `length` covering its text.
- The rules use the parameter's line and column instead of the statement's. Diagnostics about a whole statement, such as a missing data source, still point to its first line.
- Parser errors from `attachParams`, such as an unmatched parenthesis, point to where the parenthesis is.
- Feature 4's column rules still apply: columns 72–80 are never part of a piece.

**Tests**
- **Z** — A one-line statement gives the same line and column as today.
- **O** — The example above reports `JCLS002` at line 5, column 18, where the SPACE value starts.
- **M** — A DD spread over four lines, with a problem on each of lines 2, 3 and 4, gives three diagnostics, each on its own line.
- **B** — A parameter that starts in column 4 of a continuation line is reported at column 4, and one that starts in column 16 at column 16.
- **B** — A quoted string continued onto the next line (feature 5) is reported at the line and column where it starts.
- **I** — For every fixture, every diagnostic's column is within the length of its line. A test checks this.
- **E** — An unmatched parenthesis on the second line of a three-line statement is reported on the second line.
- **S** — A user clicks a diagnostic on a long DD statement, and the editor jumps to the line with the mistake.

**Done when:** No diagnostic on any fixture points past the end of its line, and every parameter-level diagnostic points to the line its parameter is on.

### 34. Severity of real JCL errors

**What it does:** Reports as errors the mistakes that z/OS itself rejects with a JCL error, so a broken job is never shown as "CLEAN".

*Found in code review:*

```
//J1   JOB (A),'X'
//S1   EXEC REGION=4M
//DD1  DD DUMMY
```

Today the EXEC with no program gets `JCLK002` as a warning, `valid` is `true`, and the header shows "CLEAN — 0 ERRORS". `errors.js` makes every `JCLK` and `JCLS` code a warning, whatever it means. Feature 20 moves one code the other way, but no feature reviews the defaults as a whole.

**How it works**
- Each entry in the `CATALOG` in `errors.js` can set its own default severity. The rule based on the code's prefix stays only as the fallback.
- These become errors, because z/OS fails the job when it sees them:
  - `JCLK002` (EXEC with no PGM or PROC)
  - `JCLK003` (positional parameter after a keyword)
  - `JCLS001` (invalid DISP)
  - `JCLS006`–`JCLS008` (invalid dataset name)
- `JCLK001` (unknown keyword) and the other value checks stay warnings, because the keyword and value tables can be incomplete for a given z/OS level.
- Must follow features 14 and 19. Until symbolic values are skipped (feature 14), and member, generation and temporary names are understood (feature 19), making DISP and DSN errors would turn today's false warnings into false errors.
- Help (feature 30's code list) shows each code's default severity.

**Tests**
- **Z** — JCL with no diagnostics is still `valid: true`.
- **O** — The example above gives `JCLK002` as an error, `valid: false`, and the header shows "1 ERROR".
- **M** — A job with one example of each listed code gets an error for each, and `stats.errors` counts them all.
- **B** — A 44-character dataset name is accepted, and a 45-character one is an error.
- **I** — Every code in `CATALOG` has a known default severity, and a test lists them so that any change is deliberate.
- **E** — `DISP=&D` inside a PROC is still skipped (feature 14) and gets no error.
- **S** — A user pastes a job where a typo removed `PGM=`, and the header turns red instead of green.

**Done when:** Every code has a deliberate default severity, the listed codes are errors, and no fixture that z/OS would reject shows as clean.

### 35. Stale results in the workbench

**What it does:** Makes sure the diagnostics shown always belong to the JCL currently in the editor.

*Found in code review:* `runValidation` in `Workbench.vue` sends a request 450 ms after each edit and shows whichever reply arrives. Nothing cancels the earlier request or checks which reply is the newest.

```
t0  user types A  -> request 1 (slow)
t1  user types B  -> request 2 (fast) -> panel shows B's results
t2                   request 1 returns -> panel shows A's results (wrong)
```

**How it works**
- Each request gets an `AbortController`. Starting a new check aborts the one in flight, including checks started with F5.
- Each request also carries an increasing number, and a reply is used only if it belongs to the newest request. This covers servers that ignore the abort.
- An aborted request is not an error. The status never shows "API UNREACHABLE" because of one.
- `loading` stays on until the newest request finishes, so "VALIDATING" doesn't switch off early.
- `api.js` accepts an optional `signal` and passes it to `fetch`.

**Tests** (Vitest component tests, see feature 1)
- **Z** — Opening the workbench sends one check and shows its result.
- **O** — One edit followed by a pause shows that edit's result.
- **M** — With the network slowed, five quick edits show only the last edit's result, and the panel never shows an older one.
- **B** — An edit made just as a reply arrives still ends with the result for the newest text.
- **I** — The header shows "VALIDATING" from the first edit until the newest reply arrives.
- **E** — When the newest request fails, "API UNREACHABLE" is shown, even if an older request succeeds later.
- **S** — A user on a slow connection fixes an error and keeps typing, and the error never comes back once fixed.

**Done when:** With a slow or reordered network, the panel and gutter always show results for the editor's current text.

## New features

These come neither from the review nor from Spec.md. They build on the fixes above and on the workbench features.

### 36. Dataset flow checks

**What it does:** Follows each dataset through the job's steps, catches mistakes that no single statement shows, and lets the user see the flow as a grid.

*New idea:* Today each DD is checked on its own. Mistakes such as reading a temporary dataset before any step creates it, or a referback to a step that doesn't exist, are only found when the job runs.

```
//J1   JOB (A),'X'
//S1   EXEC PGM=SORT
//OUT  DD DSN=&&SORTED,DISP=(NEW,PASS),SPACE=(CYL,(1,1))
//S2   EXEC PGM=REPORT
//IN   DD DSN=&&SORTD,DISP=(OLD,DELETE)
```

Line 5 reads `&&SORTD`, which no step creates (a typo for `&&SORTED`), and `&&SORTED` is passed but never read.

**How it works**
- A new rules file, `flowRules.js`, walks the steps in order, including the steps of called in-stream PROCs and catalogued PROCs (feature 23). For each dataset name it records which steps create it (`NEW`), read it (`OLD`, `SHR`), extend it (`MOD`), pass it (`PASS`) or delete it (`DELETE`).
- New diagnostics in a new `JCLF` group:
  - `JCLF001` (error): a temporary dataset is read with `OLD` or `SHR` before any earlier step creates or passes it.
  - `JCLF002` (warning): a dataset is passed but no later step reads it.
  - `JCLF003` (warning): the same dataset is created with `NEW,CATLG` twice in one job with no delete in between, so the second allocation fails.
  - `JCLF004` (warning): a dataset is read after an earlier step deletes it.
  - `JCLF005` (error): a referback such as `DSN=*.S1.OUT` or `VOL=REF=*.S1.OUT` names a step or DD that doesn't exist or comes later.
- Names that are still symbolic after known symbol values are filled in (feature 32) are skipped. So are relative GDG generations, whose flow depends on the catalog.
- Steps inside IF/THEN/ELSE blocks (feature 13) are followed on every path. A finding that depends on which branch runs is a warning, never an error.
- The API response gains `datasets`: for each name, the steps that touch it and how.
- The diagnostics panel gets a DATASETS tab with a grid: a row for each dataset and a column for each step. Each cell shows `N` (new), `R` (read), `M` (mod), `P` (pass) or `D` (delete). Clicking a cell goes to that DD.

**Tests**
- **Z** — A job with no DSN on any DD gives no `JCLF` diagnostics and an empty `datasets` list.
- **O** — The example above gives `JCLF001` on line 5 and `JCLF002` on line 3.
- **M** — A three-step job that creates, reads and deletes a temporary dataset, in that order, checks clean, and the grid shows `N`, `R` and `D` in its row.
- **B** — A referback to an earlier DD in the same step is accepted, and one to a later DD in the same step gets `JCLF005`.
- **I** — Each `JCLF` diagnostic names the dataset and the step that created, passed or deleted it.
- **E** — `DSN=&&TEMP` with `DISP=MOD` in the first step is accepted, since MOD creates a dataset that doesn't exist.
- **E** — A symbolic name (`DSN=&HLQ..DATA`) with no known value is skipped, with no crash.
- **S** — A user writes a sort-then-report job, mistypes the temporary dataset name in the report step, and sees `JCLF001` before submitting.

**Done when:** The five `JCLF` checks work on jobs and PROCs, the API returns `datasets`, and the grid shows each dataset's flow.

### 37. Inline suppressions and site profile

**What it does:** Lets users switch off a diagnostic they know is wrong for their shop, and add their own site rules, such as naming standards.

*New idea:* Every shop has local keywords, exits and standards. Without a way to silence a known false positive, users learn to ignore the panel. Without site rules, the tool can't check what reviewers actually care about.

```
//* JCLCHECK OFF-NEXT JCLK001
//S1   EXEC PGM=MYPGM,LOCALKW=YES
```

**How it works**
- Suppressions are JCL comment statements, so the JCL still runs unchanged on z/OS:
  - `//* JCLCHECK OFF-NEXT code[,code]` hides those codes on the next statement only.
  - `//* JCLCHECK OFF code[,code]` hides them until `//* JCLCHECK ON code[,code]` or the end of the job.
- Codes must always be named. There is no way to switch everything off.
- Suppressed diagnostics are still returned, with `suppressed: true`, but are not counted in `stats` or `valid`. The panel shows "3 SUPPRESSED" and can list them.
- New info diagnostics: `JCLX001` for a suppression naming a code that doesn't exist, and `JCLX002` for a suppression that hid nothing.
- A site profile is a small JSON object sent with the request as `profile`:
  - `names`: patterns for job, step and DD names. They are wildcards (`AR*`, and `%` for one character), not regular expressions, so a profile can't slow the server down.
  - `allowed`: lists of allowed values, for example for `CLASS` and `MSGCLASS`.
  - `dsnPrefixes`: allowed first qualifiers for datasets created with `NEW`.
  - `extraKeywords`: site keywords to accept on JOB, EXEC or DD.
  - `severity`: a different default severity, or `off`, for each code.
- Breaking a profile rule gets `JCLN002` (warning), naming the rule: "Job name PAYROLL1 doesn't match the site pattern 'AR*'."
- A profile that isn't valid gets a 400 response saying which field is wrong.
- In the workbench, a PROFILE panel edits the profile. It is saved with the draft (feature 28) and included in shared links (feature 29).

**Tests**
- **Z** — With no suppressions and no profile, results are the same as today.
- **O** — The example above gives no `JCLK001`, and one suppressed diagnostic is returned.
- **M** — An `OFF` for two codes hides both on every following statement, until an `ON` turns one of them back on.
- **B** — `OFF-NEXT` hides the code on the next statement, not the one after. A continued statement counts as one statement, so all its lines are covered.
- **I** — Suppressed diagnostics have `suppressed: true`, and `stats.errors` doesn't count them.
- **E** — `//* JCLCHECK OFF JCLZ999` gets `JCLX001`. A profile whose job name pattern is a number gets a 400 response.
- **E** — A pattern of 1,000 `*` characters is checked quickly and doesn't hang the server.
- **S** — A team sets a profile with job names `AR*` and classes A and B and shares a link, and a teammate's job named `PAYROLL1` gets `JCLN002`.

**Done when:** Named codes can be suppressed for one statement or a block, suppressed diagnostics stay visible but don't count, and a site profile adds naming, value and keyword rules through the API, the CLI (feature 38) and the workbench.

### 38. Command-line tool and CI output

**What it does:** Checks JCL files from a terminal or a build pipeline, so problems are found in pull requests and not only in the browser.

*New idea:* More mainframe teams now keep JCL in Git, using Zowe or Endevor's Git bridge. They need a check that runs in CI and marks problems on the pull request.

```
$ npx jclcheck jcl/*.jcl --format sarif > jclcheck.sarif
```

**How it works**
- The validator's files (`lexer.js`, `parser.js`, `validator.js`, the rules and the keyword tables) are published as their own package, so installing the CLI doesn't install Express. The API uses the same package. `validate()` already has no Express dependency, so this is mostly packaging.
- `jclcheck <files or globs>` checks each file and prints its diagnostics as `file:line:column  severity  code  message`.
- Options:
  - `--zos <level>` and `--jes <JES2|JES3>` (features 3 and 9)
  - `--library <dir>` for catalogued PROCs and INCLUDE members (feature 23)
  - `--profile <file>` (feature 37)
  - `--format text|json|sarif`
  - `--max-warnings <n>`, which also fails when there are more warnings than that
- SARIF 2.1.0 output lets GitHub code scanning and similar tools show each diagnostic on the right line of the pull request. Each code becomes a SARIF rule with its message and fix.
- Exit codes: 0 when there are no errors, 1 when any file has an error (or too many warnings), and 2 when the tool itself fails, for example when a file can't be read.
- Only Node's built-in modules are used, so no dependency is added.
- The README gets a short GitHub Actions example.
- Usage counting is opt-in:
  - The CLI counts nothing unless the user opts in, with `JCLCHECK_TELEMETRY=1` or `--telemetry`. It never asks or nags.
  - `DO_NOT_TRACK=1` in the environment always wins over opting in, following the common convention for command-line tools.
  - When opted in, each run sends one small batch to the backend's `POST /api/usage` endpoint (built in feature 2). The backend forwards it to GoatCounter with its own token, so the CLI never holds a GoatCounter token and the IP is used for the country in the same way. The events are:
    - `cli/run`, `cli/version/<version>`, `cli/node/<major version>` and `cli/os/<linux|darwin|win32>`
    - `cli/files/<1|2-10|11-100|100+>` and `cli/result/<clean|warnings|errors>`
    - `cli/format/<text|json|sarif>` and `cli/option/<zos|jes|library|profile|max-warnings>` for each option used
    - `cli/ci/<github|gitlab|jenkins|other|none>`, from the CI system's own environment variables
    - `cli/diag/<CODE>` once per code per run
  - The request has a 1-second time limit. A failure is silent and never changes the output or the exit code.
  - `JCLCHECK_TELEMETRY=debug` prints the events that would be sent and sends nothing, so users can see exactly what is shared.

**Tests**
- **Z** — `jclcheck` with no files prints its usage and exits with 2.
- **O** — One clean file prints nothing and exits with 0.
- **M** — Three files, one with an error, print that file's diagnostics with its name, and exit with 1.
- **B** — `--max-warnings 2` passes with two warnings and fails with three.
- **I** — The SARIF output passes the SARIF 2.1.0 schema, and each result has the right file, line and column.
- **E** — A missing file gives a clear message and exit code 2, and the other files are still checked.
- **S** — A team adds the GitHub Actions example, opens a pull request with a misspelled DISP, and sees the warning on that line of the diff.

- **Z** — The CLI with no opt-in sends nothing. With `JCLCHECK_TELEMETRY=1` and `DO_NOT_TRACK=1` together, it also sends nothing.
- **I** — `JCLCHECK_TELEMETRY=debug` prints the events and sends nothing.
- **E** — With the backend unreachable, an opted-in CLI run finishes within its normal time plus 1 second, with the same output and exit code.

**Done when:** `npx jclcheck` gives the same results as the API, writes text, JSON and SARIF, its exit code can fail a CI build, and opted-in runs are counted through `/api/usage`.

### 39. Formatter

**What it does:** Lays out JCL in the standard columns with one action, and fixes statements that run past column 71.

*New idea:* Pasted or hand-typed JCL often has ragged columns and lines that are too long. Today the tool can only report a line that is too long (`JCLL002`).

```
before:
//STEP1 EXEC PGM=IEBGENER,REGION=0M,PARM='SOME LONG PARM',COND=(4,LT),TIME=5

after:
//STEP1    EXEC PGM=IEBGENER,REGION=0M,PARM='SOME LONG PARM',
//             COND=(4,LT),TIME=5
```

**How it works**
- A new `format(source)` function in the backend, next to `validate`, is used by a new `POST /api/format`, by the workbench and by the CLI (`jclcheck format`, feature 38).
- For each statement it:
  - puts the name in column 3, the operation in column 12 and the operand one blank after the operation
  - puts the operand of each continuation line in column 16
  - breaks long operands after a comma, so that no text passes column 71
  - uppercases names, operations and keyword names, but leaves values as written, since `PATH` values and PARM text are case-sensitive
- It never changes comment statements, trailing comments, in-stream data or JES2 and JES3 statements. Statements with sequence numbers in columns 73–80 (feature 4) are left as they are, since renumbering is a separate job.
- A parameter too long for one line, such as a long quoted PARM, is continued using feature 5's rules for quoted strings. If that isn't possible, it is left as it is.
- The result must mean the same as the input. The formatter checks both versions and refuses a result whose statements, parameters or diagnostics differ (apart from line-length diagnostics), saying why.
- The workbench gets F4 FORMAT on the PF-key bar, with Alt+R as its fallback, using feature 26's key handling. It shows a before-and-after preview, and Undo brings the old text back.

**Tests**
- **Z** — Formatting empty text gives empty text.
- **O** — The example above gives exactly the "after" text.
- **M** — Formatting already formatted JCL changes nothing, and formatting twice gives the same result as formatting once.
- **B** — A statement that ends exactly at column 71 stays on one line. One that would reach column 72 is broken at its last comma before column 71.
- **I** — The preview marks each changed line, and `POST /api/format` returns the text and a list of the changed lines.
- **E** — In-stream data, comments, quoted strings and `PATH='/u/MixedCase'` come out exactly as they went in.
- **E** — A statement with an unmatched parenthesis is left unchanged, and the response says why.
- **S** — A user pastes a ragged job with lines that run past column 71, presses F4 and accepts the preview, and every statement now ends by column 71.

**Done when:** Formatting is repeatable, never changes what the JCL means, and leaves no statement text past column 71 when that can be avoided.

### 40. Keyword explanations on hover

**What it does:** Explains a keyword and its value in plain English when the user hovers over it in the editor.

*New idea:* Many users are learning JCL. `DISP=(NEW,CATLG,DELETE)` is easier to learn from "Create the dataset; catalog it if the step ends normally; delete it if the step abends" than from the reference.

**How it works**
- Each keyword in `keywords.js` gains a short description, and so does each allowed value in feature 14's value rules. Positional sub-parameters, such as DISP's status, normal and abnormal parts, are described by position.
- `GET /api/keywords?zos=<level>` returns the descriptions, so the workbench loads them once. The level matters because some keywords only exist at some levels (feature 3).
- Hovering over a keyword or value in the editor shows its description, each part of the value explained in turn, the z/OS level it appeared in, and a link to the matching page of the IBM JCL Reference. Feature 25's tokeniser finds what is under the pointer.
- When the same text also has a diagnostic underline, the diagnostic is shown first and the explanation below it.
- Alt+K shows the same panel for the keyword at the cursor, so it works without a mouse and on touch screens.
- A test checks that every keyword in the tables has a description.

**Tests**
- **Z** — Hovering over blank space or a comment shows nothing.
- **O** — Hovering over `DISP` in `DISP=SHR` shows what DISP does, and hovering over `SHR` shows "Use an existing dataset; other jobs may read it at the same time."
- **M** — Hovering over `(NEW,CATLG,DELETE)` explains all three parts in order.
- **B** — Hovering over the first or last character of a keyword shows it, and the blank just after it shows nothing.
- **I** — The panel shows the z/OS level the keyword appeared in, and its link opens the matching reference page.
- **E** — Hovering over an unknown keyword shows its diagnostic and "No description: not a known keyword", with no crash.
- **E** — When `/api/keywords` can't be reached, hovering shows nothing and checking still works.
- **S** — A trainee hovers over each part of a DD statement copied from a colleague and understands it without opening the reference.

**Done when:** Every keyword and value in the tables has a description, hovering and Alt+K show it in the right place, and the descriptions match the chosen z/OS level.

## Wrapping up

### 41. Questions and final checks

**What it does:** Collects the questions that need an answer from the JCL reference or from Nick before some rules can be finalised, and the checks to do once everything is built.

**How it works**
- Each item says what is unsure, which feature it affects and what to do. Remove an item once it is settled.

**Questions to confirm**
- **NOTIFY= user ID length (feature 16).** Nick says 1–8 characters. Some editions of the JCL reference describe TSO/E user IDs as 1–7. Check the current reference and use whatever it says.
- **NOTIFY=node.userid (feature 16).** Is `NOTIFY=N1.IBMUSER` valid on the JOB statement, or only as `USER=` on the NOTIFY statement? Nick lists it without saying. *For now:* feature 16 accepts `node.userid` on the JOB statement, so this never gives a false warning, and the provisional fixture `nick/07c-notify-node` pins that. If the reference says it isn't valid, remove the `node.userid` form from `NOTIFY_USER` in `keywords.js` and update the fixture.
- **NOTIFY statement TYPE values (feature 17).** Nick's item 14 uses `TYPE=TSO`. Confirm the allowed values, so his example isn't wrongly flagged or wrongly accepted. *For now:* feature 17 allows `MSG` and `EMAIL` (the values in feature 14's example message, and the reference as remembered), so `TYPE=TSO` gets a `JCLS009` warning. The provisional fixture `nick/14b-notify-email` pins that. If `TSO` is valid, add it to `NOTIFY_KEYWORDS` in `keywords.js` and remove the warning from the fixture.
- **NOTIFY statement placement and limit (feature 17).** Confirm where NOTIFY statements can go and how many a job can have. *For now:* after the JOB statement and before the first EXEC, at most 8 per job (`MAX_NOTIFY` in `parser.js`).
- **Which duplicate DD is used (feature 20).** Nick says the last. The reference says both are allocated and references go to the first. Ask Nick, or test on a real system, before writing the message. *For now:* `JCLD001` is a warning that says both DDs are allocated but a program can reach only one of them by that name, without naming which. Once confirmed, name the one that's used in the message in `errors.js`.
- **In-stream PROC before the first JOB (feature 10).** The bundled "PROC + SYMBOLICS" sample defines `MYPROC` before the JOB statement. Confirm whether z/OS accepts this. If not, fix the sample and add a placement rule.
- **JES3 statement list (feature 9).** Confirm the JES3 statements, their keywords and the placement rules against the z/OS 2.5 JES3 reference. The keyword tables for `MAIN`, `FORMAT`, `NET`, `NETACCT` and `DATASET` in `keywords.js`, and which statements must come before the first EXEC (`MAIN`, `NET`, `NETACCT`, `PROCESS`, `ENDPROCESS`) or before the JOB statement (`PAUSE`), were written from memory of the reference and need checking.
- **JES3plus (feature 9).** Phoenix Software's JES3plus keeps JES3 running on z/OS 3.1 and later. JES3 support here follows IBM and stops at 2.5. Decide whether JES3plus shops should be able to choose JES3 at 3.x.
- **Level marks (feature 3).** Only `EMAIL=` on the JOB statement and the NOTIFY statement carry a `since` level so far (both z/OS 2.3, the oldest supported level), so `JCLK005` can't fire on today's real data. Fill in `since`/`until` for other keywords from each release's "Summary of changes" in the MVS JCL Reference, citing the source in a comment.
- **Doubled quote split over a line break (feature 5).** When a quoted string closes exactly in column 71 and the next line has a quote in column 16, JCLcheck reads the pair as one literal quote (`''`) inside a continued string. The JCL Reference doesn't spell this case out; confirm it on a real system.
- **Supported z/OS levels (feature 3).** The proposed list is 2.3, 2.4, 2.5, 3.1 and 3.2, with 3.2 as the default. Decide whether to keep releases that are out of support.
- **Checking JCL sent to the internal reader (feature 7).** It is left unchecked for now. Checking it as a separate job stream could be added later.
- **IF nesting limit (feature 13).** Confirm the maximum IF/THEN/ELSE nesting depth (15 is assumed).
- **NOT sign in IF conditions (feature 13).** Only `¬` and the word `NOT` are accepted. Some PC keyboards and code pages turn `¬` into `^` or `!`. Decide whether to accept those as aliases.
- **Job group keywords (feature 22).** The keyword tables for JOBGROUP, GJOB, JOBSET, SJOB, AFTER, BEFORE, CONCURRENT and SCHEDULE in `keywords.js` (`GROUP_KEYWORDS`) were written from memory of the JES2 job group section. Confirm them against the reference, and add value rules (for example `ACTION`, `OTHERWISE`, `FLUSHTYP`).
- **INCLUDE rules (feature 23).** Confirm the INCLUDE nesting limit and which statements an INCLUDE group can't contain. *For now:* nesting up to 15 levels (`MAX_INCLUDE_DEPTH` in `library.js`), and JOB, PROC, PEND and JCLLIB are refused in a member (`NOT_IN_INCLUDE`).
- **LIKE with SYSOUT and in-stream data (feature 31).** Confirm that z/OS rejects `LIKE` on these DDs rather than ignoring it. *For now:* feature 31 reports it as `JCLD003`, an error.
- **System symbols in JCL (feature 32).** Confirm which system symbols JCL can use at each z/OS level besides `&SYSUID`, and whether that depends on the job class allowing system symbols.
- **Underline lengths (feature 33).** Feature 33 gives each parameter its own line and column, but not a `length`, since nothing used it yet: most diagnostics still underline one character. Decide whether diagnostics should underline the whole parameter or value, and add the lengths then.
- **IF and WHEN conditions over several lines (feature 33).** IF conditions keep their own per-character positions. A `WHEN=` condition on a NOTIFY or job group statement that runs onto another line is reported on the line its value starts, with columns counted as if it were one line.
- **Severities (feature 34).** Confirm, on a real system or in the messages manual, that each code made an error fails the job with a JCL error. Feature 34 also made the other codes' severities explicit, keeping what they were (for example `JCLK004` too many positionals and `JCLK007`/`JCLK009` stay errors, `JCLR003` unmatched DD overrides stays a warning); `test/severities.test.js` lists them all. It also found that a symbolic `DISP=&D` in a PROC was still checked, and now skips symbolic values in the DISP, SPACE, DCB, REGION, TIME, RECFM and DSORG checks.
- **Thanks on the About page (feature 30).** Feature 30 suggested a short "Thanks" line on the About page crediting Nick's review, if he agrees. It hasn't been added. Ask Nick, then add it to `About.vue`.
- **Dataset flow details (feature 36).** Choices to confirm: a `NEW` dataset with no normal disposition counts as deleted when its step ends, so reading it later gets `JCLF004`; DD overrides without a procedure step name (`//OUT DD ...` on a step calling a PROC) aren't applied to the flow, only `PROCSTEP.DD` ones; after a step that calls a PROC that wasn't supplied, `JCLF001` and `JCLF002` are not reported, since that PROC may create or read the dataset; and a grid cell joins a step's actions (`NP` for `DISP=(NEW,PASS)`). `DCB=*.STEP.DD` referbacks aren't checked yet.
- **Suppression and profile details (feature 37).** Choices to confirm: an `OFF` written before the JOB statement covers that job, and the next JOB statement or a `//` null statement ends an `OFF` block; an `ON` for a code that isn't off is ignored; suppressions only apply to the job's own lines, not to diagnostics inside library members; a code the profile switches `off` isn't returned at all (unlike a suppressed one); `dsnPrefixes` applies to DDs whose DISP status is NEW, or that have no DISP; `allowed` applies to that keyword on every JOB, EXEC and DD; and a profile's `names.dd` isn't applied to `PROCSTEP.DD` overrides. The workbench edits the profile as JSON text; a form could come later.
- **Formatter layout (feature 39).** Columns 12 and 16 are the common convention. Decide whether shops need other layouts, which could become part of the site profile (feature 37).
- **Package name (feature 38).** Check that `jclcheck` is free on npm, or choose another name.

**Final checks**
- Every fixture from Nick's notes passes `npm test`, and none is still `todo`.
- The three workbench samples still give the same results they gave before, or the change is explained.
- The cross-browser behaviour of features 23–29 and of the workbench parts of features 2, 35–37, 39 and 40 is tried by hand in current Firefox, Chrome, Safari and Edge. Everything else is covered by the frontend tests.
- Help and the README cover what features 2 and 31–40 added, following feature 30: the `JCLF` and `JCLX` groups, `JCLN002`, `profile`, `datasets`, `POST /api/format`, `GET /api/keywords`, the CLI, `POST /api/usage`, the `VITE_GOATCOUNTER_URL` and `GOATCOUNTER_TOKEN` settings, and the CLI's `JCLCHECK_TELEMETRY` and `DO_NOT_TRACK` settings.
- After deploy, the GoatCounter dashboard shows page views and events from the production site, and none from previews or localhost.
- `npx jclcheck` gives the same results as the API on every fixture.
- The production site is checked after deploy: the workbench reaches the API, the level picker loads, a draft survives a reload, and a shared link opens correctly in another browser.
- Nick is sent a short reply listing each of his items and what changed.

**Done when:** Every question above has been answered and its feature updated, and every final check has passed.
