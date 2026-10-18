# Tasks

## 1. Backend: testable app

- [x] 1.1 Change `backend/src/index.js` to export `app` and a `createApp({ analytics })` factory, and call `listen` only when `require.main === module`; verify `npm start` still serves `/api/health`, and that a new `test/api.test.js` can start the app on port 0 and get `{ ok: true }` from `/api/health` and a result from `POST /api/validate`
- [x] 1.2 Read `TRUST_PROXY` into `app.set('trust proxy', ...)`, as a number of hops when it's numeric (unset means don't trust); verify with tests that `req.ip` ignores `X-Forwarded-For` when unset, and with `TRUST_PROXY=1` and `X-Forwarded-For: 1.2.3.4, 5.6.7.8` gives `5.6.7.8`
- [x] 1.3 When run directly, handle `SIGTERM` and `SIGINT` by closing the server, flushing analytics (at most 5 seconds), and exiting with status 0; verify a test that starts `node src/index.js` with a fake GoatCounter address on a local test server, records a direct hit, sends `SIGTERM`, and sees the hit arrive and the process exit 0 within 6 seconds

## 2. Backend: analytics queue and sender

- [x] 2.1 Create `backend/src/analytics.js` with `createAnalytics({ token, siteUrl, send, intervalMs, maxBatch })` returning `{ record, flush, stop }`. Without a token, `record` does nothing. With one, it queues hits on a timer that is `unref()`ed. Verify with `test/analytics.test.js`: no token means `send` is never called; five recorded hits go out in one `flush`; 150 hits go out as batches of 100 and 50; `stop()` clears the timer
- [x] 2.2 Check GoatCounter's API documentation for the count endpoint and field names, then make `flush` post `{ hits: [{ path, title, event: true, ip, user_agent }] }` to `${siteUrl}/api/v0/count` with `Authorization: Bearer <token>` and a 5-second timeout. Verify tests assert the URL, headers and body; that a rejecting or hanging `send` is dropped without throwing; and that the queue is empty afterwards

## 3. Backend: counting direct API use

- [x] 3.1 Add the direct-use middleware for `POST /api/validate`. On `finish`, it records `api/validate/direct` and `api/result/<ok|bad-request|error>` with `req.ip` and the user agent, and skips requests with `X-JCLcheck-Client: workbench`, `DNT: 1` or `Sec-GPC: 1`. Verify `test/api.test.js` checks: a curl-style request records both hits with its user agent; the workbench header records nothing; `DNT: 1` and `Sec-GPC: 1` record nothing; a 500 from the validator records `api/result/error`
- [x] 3.2 Wire the real analytics into the default app from `GOATCOUNTER_TOKEN` and `https://jclcheck.goatcounter.com`, with a `GOATCOUNTER_SITE_URL` override used only by tests (task 1.3); verify a test with a `send` that never resolves shows `/api/validate` still answering in under 200 ms

## 4. Backend: `/api/usage`

- [x] 4.1 Add the CLI allowed list to `src/analytics.js` and the `POST /api/usage` route, as in design decision 11; verify tests for: a valid batch answers 202 and records each event; an unknown name answers 400, names it, and records nothing; 31 events answers 400; `Sec-GPC: 1` answers 204 and records nothing; a missing or non-array `events` answers 400

## 5. Frontend: analytics core

- [x] 5.1 Create `frontend/src/analyticsEvents.js` with every event from Features.md feature 2, each entry with its allowed details (fixed list, bucket list, `JCL` code pattern or number range), a title template and, for later features, the feature number; verify a test checks that every entry has a title and that the code pattern accepts `JCLK001` but rejects `JCLK01`, `JCL K001` and `MY.DSN`
- [x] 5.2 Create `frontend/src/analytics.js` with `initAnalytics(env)`, `pageview(route)` and `track(name, detail)`, and call `initAnalytics()` from `main.js`. Behaviour: gating on `VITE_GOATCOUNTER_URL`, the hostname, Do Not Track and Global Privacy Control; `window.goatcounter = { no_onload: true }` before adding the script; queue until `load`; drop the queue on `error`; detail checking. Verify `tests/analytics.test.js` with a fake environment: production with the address set adds exactly one script with the right `src` and `data-goatcounter`; production without the address adds none; `localhost`, a preview address, `doNotTrack: '1'` and `globalPrivacyControl: true` add none and count nothing; calls made before `load` are delivered after it, in order; an `error` makes later calls no-ops without throwing; a detail that isn't allowed sends nothing
- [x] 5.3 Add path sanitising to `pageview` (keep `zos`, `jes`, `ref` and `utm_*`, drop the hash, count the catch-all route as `/404`); verify a test that `/app?zos=3.1&utm_source=x&name=SECRET#jcl=abc` is counted as `/app?zos=3.1&utm_source=x`, with the route's title

## 6. Frontend: page views and the 404 page

- [x] 6.1 Count a page view in `router.afterEach` (on the first navigation too), and add a catch-all route to a new `src/pages/NotFound.vue` with a "page not found" message, a link to `/`, and its own title and description; verify `tests/router.test.js` with `analytics.js` mocked: `/`, `/about` and `/app` give three `pageview` calls; `/no-such-page` renders the not-found page and is counted as `/404`; the existing route-metadata tests still pass

## 7. Frontend: site navigation events

- [x] 7.1 Add click tracking to the calls to action (`cta/launch/<nav|hero|bottom|footer|about>` and `cta/about/hero`) and the outbound links (`outbound/<github-repo|github-profile|portfolio>`) in `Navbar.vue`, `Footer.vue`, `Landing.vue` and `About.vue`; verify `tests/components/SiteLinks.test.js` checks each link's event, and that each link still points where it did
- [x] 7.2 Add `@toggle` tracking to the FAQ `<details>` in `Landing.vue` (`faq/open/<n>`, counting from 1, only when opening); verify a test that opening question 2 counts `faq/open/2` and closing it counts nothing

## 8. Frontend: workbench events

- [x] 8.1 Make `api.js` send `X-JCLcheck-Client: workbench` and throw errors with `status`: the HTTP status, or `0` when `fetch` rejects; verify `tests/api.test.js` covers the header, `status: 500`, and `status: 0` for a rejected `fetch`, and still passes its existing cases
- [x] 8.2 Track `check/button`, `sample/<key>`, `clear/button`, `help/open/button`, `diag/click/<code>`, `api/error/<status>` and `api/unreachable` in `Workbench.vue`, with `analytics.js` mocked in `tests/pages/Workbench.test.js`; verify a test for each event, a test that 30 automatic checks send no `check/` event, and that every existing workbench test still passes, including the three expected failures
- [x] 8.3 Track `diag/seen/<code>` once per visit and `diag/fixed/<code>` once per visit, only after user edits; verify tests that a code seen in three checks counts once, that removing it by editing counts `diag/fixed`, and that removing it by loading a sample or clearing doesn't
- [x] 8.4 Emit a `paste` event with the line count from `Editor.vue`, and track `editor/paste/<bucket>` in the workbench; verify an Editor test checks the emitted line count, and a Workbench test that pasting 12 lines counts `editor/paste/11-50`

## 9. Frontend: visit summary

- [x] 9.1 Collect the checks, largest line count, start time, response times and last result per visit, and send the `visit/` summary once on `visibilitychange` to hidden, `pagehide` or unmount (none for a visit with zero checks); verify tests with fake timers for the summary example in the spec (`21-100`, `11-50`, `1-5m`, `0-250ms`, `errors`), bucket edges at 10 and 11 lines, a single summary when the page is hidden and then unmounted, and no summary without checks

## 10. Frontend: privacy guarantees

- [x] 10.1 Write `tests/privacy.test.js`, which runs the real `analytics.js` with a fake `goatcounter.count` on the production hostname, mounts the router and the workbench, and checks, edits and pastes JCL containing a unique marker and clicks its diagnostics; verify that no argument passed to `count` contains the marker or `#`, that `document.cookie` is empty, and that nothing new appears in `localStorage`
- [x] 10.2 Make `tests/setup.js` fail any test that adds a `gc.zgo.at` script to the document outside `tests/analytics.test.js` and `tests/privacy.test.js`; verify a temporary test that adds one fails, then delete it, and confirm the full frontend suite passes

## 11. Privacy copy and documentation

- [x] 11.1 Add a FAQ entry to `faq.js` about anonymous counting: GoatCounter, no cookies, no personal data, what is counted, Do Not Track and Global Privacy Control respected, and JCL never stored or counted. Update the landing trust line so it mentions anonymous usage counts. Verify a test that the FAQ structured data built in `router.js` contains the new answer
- [x] 11.2 Add a "Privacy" section to `HelpModal.vue` with the same points, and update the Privacy line in `Spec.md`; verify by reading them that the help, FAQ and Spec.md say the same thing
- [x] 11.3 Document in the README `VITE_GOATCOUNTER_URL` (frontend, set on Netlify), and `GOATCOUNTER_TOKEN` and `TRUST_PROXY` (backend, set on Render): what each does, that unset means off, the Render hop-count check, and that analytics only runs on `jclcheck.xyz`; verify the documented `npm start` still works with neither variable set
- [x] 11.4 Update Features.md:
  - feature 2's setup bullet: `count.js` is loaded from `analytics.js`, not a static tag, when `VITE_GOATCOUNTER_URL` is set and the hostname, Do Not Track and Global Privacy Control checks pass; the API is on Render, so `TRUST_PROXY` is needed
  - feature 2's matching Z test
  - move the CLI's own counting bullets to feature 38, leaving a pointer in feature 2
  - feature 2's **Done when**, so it says later features send their own events

  Verify feature 2 no longer says the script is a static tag in `index.html`, and that feature 38 holds the CLI counting details.

## 12. Integration checks

- [x] 12.1 Run `npm test` in `backend/` and `frontend/`; verify both exit 0, the backend still reports 18 todo, and the frontend's three expected failures still show as passing
- [x] 12.2 Run `npm run build` in `frontend/`; verify it succeeds, and that the built `index.html` contains no `gc.zgo.at` script tag, since the script is added only at runtime
- [x] 12.3 Temporarily change the `JCL` code pattern in `analyticsEvents.js` so it accepts any text; verify that `tests/privacy.test.js` or the allowed-list tests fail, then revert and verify both suites pass

## Workflow follow-up

- Before deploying, set `GOATCOUNTER_TOKEN` and `TRUST_PROXY=1` on Render, and `VITE_GOATCOUNTER_URL=https://jclcheck.goatcounter.com/count` on Netlify (production context). After deploying, check the Render hop count as the design's Open Questions describe. Then open `https://jclcheck.xyz`, the workbench and a curl request, and confirm in the GoatCounter dashboard that page views, workbench events and `api/validate/direct` (with the right country) arrive. Also confirm the visit summary and the referrer behaviour (design Open Questions).
- Archive the change after review.
