# Design

## Context

- The frontend is a Vue 3 single-page app served by Netlify from `jclcheck.xyz`, with `www` redirected to the apex. `router.js` already runs `applyPageSeo` in `router.afterEach`, and there is no catch-all route. `main.js` creates the app.
- The calls to action and outbound links live in `Navbar.vue`, `Footer.vue`, `Landing.vue` (hero and bottom) and `About.vue`. FAQ items are `<details>` elements rendered from `faq.js`. The FAQ structured data is built from the same list in `router.js`.
- `Workbench.vue` holds the editor text, runs `validateJcl` on mount and 450 ms after each edit, and handles the PF-key events (`validate`, `sample`, `clear`, `help`) and diagnostic selection. Its F keys don't work from the keyboard yet (feature 26), so today every trigger is a button.
- `api.js` throws an `Error` whose message contains the status. No structured status is available.
- The backend `src/index.js` creates an Express app and calls `listen` when it is loaded, so tests can't import it. It runs on Node 22 or later, which has a global `fetch`. The API is hosted on Render at `https://jclcheck.onrender.com` for now, and the frontend reaches it through `VITE_API_BASE`.
- The regression suites from feature 1 exist:
  - backend: `node:test`
  - frontend: Vitest with jsdom and a global `fetch` guard. The jsdom hostname is `localhost`.

See proposal.md for why, and the two delta specs for the required behaviour.

## Goals / Non-Goals

**Goals:**
- One small frontend module that owns all GoatCounter access. Components call `track(name, detail)` and never touch `window.goatcounter`.
- Privacy enforced in code, not by convention: an allowed list for every event detail, sanitised paths, and gating on hostname, Do Not Track and Global Privacy Control.
- Backend counting that can't affect API latency or availability.
- Everything testable without the network, with fakes for the browser environment and for GoatCounter.

**Non-Goals:**
- Sending events for features that aren't built (features 23–40). Their names go on the allowed list now, but each feature adds its own calls.
- The CLI's counting code (feature 38). Only the backend's receiving endpoint is built here.
- Counting `/api/format` and `/api/keywords`. They don't exist yet; the middleware takes a list of counted endpoints, and those features add themselves to it.
- A consent banner, a public dashboard, or self-hosting `count.js`. These were settled in Features.md: no banner, private dashboard, and blocked scripts are simply not counted.

## Decisions

### 1. Load `count.js` from code, not from a static tag in `index.html`
`initAnalytics()` runs from `main.js` before the app mounts. If `import.meta.env.VITE_GOATCOUNTER_URL` is set, the hostname is exactly `jclcheck.xyz`, and neither `navigator.doNotTrack === '1'` nor `navigator.globalPrivacyControl === true`, it:
1. sets `window.goatcounter = { no_onload: true }`
2. appends `<script async src="https://gc.zgo.at/count.js" data-goatcounter="<VITE_GOATCOUNTER_URL>">`

Otherwise it does nothing, and every later call is a no-op.
- **Why:** the snippet the user gave is a static tag. That would count on localhost and previews, and before any Do Not Track check could run. Loading it from code keeps the same script and count address and adds the gates. `no_onload` stops count.js from counting the first page by itself, so the router counts every page, including the first, exactly once.
- **Address:** `https://` replaces the protocol-relative `//gc.zgo.at`, since the site is HTTPS-only.
- **Configuration:** the count address comes from `VITE_GOATCOUNTER_URL`, which is set on Netlify as `https://jclcheck.goatcounter.com/count`, so the site can be pointed at another GoatCounter site without a code change. The hostname gate stays as well. Netlify build variables apply to deploy previews unless they are scoped to the production context, and the hostname check keeps previews out either way.
- **Alternative:** the static tag plus `data-goatcounter-settings`. Do Not Track and Global Privacy Control would still need code, and the hostname check would be split across two places.

### 2. Queue calls made before the script loads
`count.js` is async, but the first page view happens straight away. `analytics.js` keeps a queue of `{ path, title, event }` calls and flushes it on the script's `load` event. Calls after that go straight to `window.goatcounter.count(...)`. If the script fails to load (`error`), the queue is dropped and later calls do nothing, without throwing.
- **Owner's own visits:** `#toggle-goatcounter` keeps working, because `count.js` checks its own setting inside `count()`.

### 3. Allowed list in `src/analyticsEvents.js`
The list maps `area/action` to its allowed details. A detail is one of:
- a fixed list (`hero`, `nav`, `bottom`, `footer`, `about`, …)
- a bucket list (`1-10`, `11-50`, …)
- the code pattern `^JCL[A-Z][0-9]{3}$`
- a small integer range (FAQ question numbers)

`track(name, detail)` builds `area/action/detail`. It counts only if the detail passes, and otherwise drops the event (with a `console.debug` in development). The list already holds the later features' events from Features.md, each marked with its feature number.
- **Why a pattern for codes:** the frontend can't import the backend's `errors.js`. A seven-character `JCL` code pattern can't carry user text, and new codes don't need a frontend change.
- **Titles:** each entry has a readable title template, for example "Diagnostic seen: JCLK001". The GoatCounter dashboard shows those titles.
- **Alternative:** sending free-form names and trusting each call site. That's one typo away from leaking a dataset name.

### 4. Paths are sanitised before counting
`pageview(route)` counts `route.path` plus only the `zos`, `jes`, `ref` and `utm_*` query parameters, in their original order, and never the hash. The page title is the route's `meta.title`. The catch-all route is counted as `/404`, never as the unknown address, which could contain anything.

### 5. Workbench instrumentation without changing its behaviour
- **Triggers:**
  - The PF-key handlers pass a trigger to `track`: `check/button`, `sample/<key>`, `clear/button` and `help/open/button`.
  - Automatic checks are never tracked one by one; they only feed the visit summary.
  - The `shortcut` and F-key details are on the list for feature 26.
- **Diagnostics:**
  - Keep a visit-level `seenCodes` set and a `fixedCodes` set.
  - After each check, codes not yet seen count `diag/seen/<code>`.
  - Codes that were in the previous result, are missing now, and disappeared after a user edit (not Clear or a sample) count `diag/fixed/<code>` once per visit.
  - The source of the last change is a flag set by the editor input handler and reset by `sample` and `clear`.
- **Clicks:** clicking an entry counts `diag/click/<code>` in the existing `onSelectDiagnostic`.
- **API problems:** `api.js` throws an error with a `status` property, which is the HTTP status, or `0` when `fetch` itself rejects. `runValidation` counts `api/error/<status>` for a non-zero status and `api/unreachable` for `0`. Statuses are allowed if they are three-digit numbers from 400 to 599.
- **Paste:** `Editor.vue` emits a new `paste` event with the pasted text's line count. The text itself never leaves the component. The workbench counts `editor/paste/<bucket>`.

### 6. Visit summary
- **Gathering:** the workbench records, per visit:
  - the number of checks
  - the largest line count checked
  - the start time
  - each check's response time, measured with `performance.now()`
  - the last result
- **Sending:** the summary is sent once, the first time any of these happens: `visibilitychange` to hidden, `pagehide`, or the workbench unmounting (leaving the route). A `sent` flag guards it.
- **Bucket edges:**
  - checks: 1, 2–5, 6–20, 21–100, 100+
  - lines: 1–10, 11–50, 51–200, 201–1000, 1000+
  - time: under 1 minute, 1–5, 5–20, 20+ minutes
  - latency: median under 250 ms, 250 ms–1 s, 1 s+
- **No checks:** a visit with zero checks sends no summary.

### 7. Site navigation events
Links keep their markup and behaviour, and gain `@click` handlers that call `track`. `RouterLink` accepts native click listeners. FAQ `<details>` gain `@toggle` and track only when the event's target is `open`, with numbers starting at 1. Outbound links:
- navbar GitHub → `github-repo`
- footer and About GitHub → `github-profile`
- footer and About portfolio → `portfolio`

### 8. API client header
`validateJcl` adds `X-JCLcheck-Client: workbench`. The request already sends `Content-Type: application/json`, so cross-origin calls already need a preflight. The existing `cors()` setup allows any request header, so this costs no extra round trip and needs no CORS change.

### 9. Backend: exported app, injected analytics
- **Exported app:** `src/index.js` exports `app` and calls `listen` only when `require.main === module`, so `npm start` is unchanged.
- **Analytics module:** `src/analytics.js` exports `createAnalytics({ token, siteUrl, send, intervalMs = 10000, maxBatch = 100 })`, which returns `{ record(hit), flush(), stop() }`.
  - **Without a token:** `record` is a no-op.
  - **With a token:**
    - The timer is `unref()`ed, so it never keeps the process alive.
    - `flush()` posts up to 100 hits to `${siteUrl}/api/v0/count` with `Authorization: Bearer <token>` and the body `{ no_sessions: true, hits: [{ path, title, event: true, ip, user_agent }] }`. Checked against GoatCounter's `handlers/api.go`:
      - the field names match
      - the limit is 500 hits per request
      - success is 202
      - the token needs the "count" permission, from an admin user
      - `no_sessions: true` stops hits without a user agent from being rejected
    - Each post has a 5-second `AbortSignal.timeout`. Failures are caught and dropped.
  - **Tests:** `send` defaults to the global `fetch`; tests pass a fake.
- **App setup:** the app reads `GOATCOUNTER_TOKEN` at startup. Tests build their own analytics object through a small `createApp({ analytics })` factory, exported next to the default `app`.
- **Why:** batching keeps GoatCounter calls far below its rate limits. Keeping all sending off the request path means a dead GoatCounter can't slow the API down.
- **Shutdown flush:** Render's free tier stops an idle service after about 15 minutes, and stops it on every deploy, with `SIGTERM`. When run directly, `index.js` handles `SIGTERM` and `SIGINT`: it stops accepting connections, calls `flush()` with the same 5-second timeout, and then exits. Without this, hits from the last 10 seconds before a spin-down would be lost.

### 10. Direct-use middleware and the client IP
- **Which requests:** middleware runs on the counted endpoints (only `POST /api/validate` for now). On `res.on('finish')` it records `api/validate/direct` and `api/result/<ok|bad-request|error>` (2xx, 4xx or 5xx), unless the request has `X-JCLcheck-Client: workbench`, `DNT: 1` or `Sec-GPC: 1`.
- **What each hit carries:** `ip: req.ip` and `user_agent: req.get('user-agent')`.
- **Behind a proxy:** the API runs on Render (`https://jclcheck.onrender.com`). Render puts a proxy in front of the service and passes the client address in `X-Forwarded-For`, so the socket address is always the proxy's. `app.set('trust proxy', …)` reads `TRUST_PROXY`:
  - a number of hops (such as `1`) makes `req.ip` the address that many entries from the right of `X-Forwarded-For`
  - unset means the socket address, which suits local runs and direct hosting
  - The right hop count for Render isn't documented clearly, so it is checked after the first deploy (see Open Questions). The middleware doesn't hard-code anything about Render.
- **Alternative:** always trusting `X-Forwarded-For`. That lets any client fake its country.

### 11. `POST /api/usage`
- **Request:** JSON `{ events: string[] }`, up to 30 names, each checked against the CLI allowed list in `src/analytics.js`. The list covers:
  - `cli/run`, `cli/version/<semver>`, `cli/node/<major>`, `cli/os/<linux|darwin|win32>`
  - `cli/files/<bucket>`, `cli/result/<clean|warnings|errors>`, `cli/format/<text|json|sarif>`
  - `cli/option/<zos|jes|library|profile|max-warnings>`
  - `cli/ci/<github|gitlab|jenkins|other|none>`
  - `cli/diag/<JCL code>`
- **Responses:**
  - **202:** the request is valid and its events are queued.
  - **400:** a JSON error names the first rejected event, and nothing is queued.
  - **204:** the request carried `DNT: 1` or `Sec-GPC: 1`, so nothing is counted.
- **Express JSON limit:** the app already uses `express.json({ limit: '2mb' })`, so a request with 30 short names is far within it.

### 12. Testing approach
- **Frontend:**
  - **Environment:** `initAnalytics` takes an optional `{ location, navigator, document, goatcounter }` environment.
  - **Analytics tests:** pass `jclcheck.xyz` and a fake `goatcounter.count` spy, and simulate the script's `load` event.
  - **Component tests:** use `vi.mock('../../src/analytics.js')` and assert `track` calls.
  - **Privacy check:** a marker test checks the workbench with a unique string in the JCL, and asserts the marker never appears in any argument passed to the fake `count`.
  - **Existing tests:** they keep passing unchanged, because the jsdom hostname is `localhost`.
- **Backend:** tests create the app with a fake analytics object and use `app.listen(0)` with `fetch`. Queue tests use a fake `send` and `flush()` called by hand, so no real timers are needed.

## Risks / Trade-offs

- [Ad blockers and privacy browsers block `gc.zgo.at`, so visits are undercounted.] → Accepted. The counts show trends, not exact totals, and proxying the script through the site would weaken the "blocked means not counted" promise.
- [The visit summary may be lost when a tab closes, if the request doesn't complete.] → It is also sent on `visibilitychange` to hidden, which fires before most closes. Delivery is checked in the dashboard after deploy (see Open Questions).
- [Anyone can post fake `cli/…` events to `/api/usage` and inflate CLI counts.] → The allowed list limits what can be faked to known event names. CLI numbers are treated as rough, and rate limiting can be added if abuse shows up.
- [Client IPs are passed to GoatCounter for direct API use.] → Accepted by the owner. GoatCounter uses them for the country and doesn't store them, and the privacy copy says so.
- [In single-page navigation, `count.js` could report the first page's referrer on every later page view.] → Later page views pass an empty referrer, so referrers describe where visits start (see Open Questions).
- [A wrong `TRUST_PROXY` setting gives every direct request the proxy's country, or lets a client fake its address with its own `X-Forwarded-For`.] → This is documented in the README and checked once after deploy on Render (see Open Questions).
- [Render's free tier sleeps when idle, so the first direct request after a sleep waits for a cold start.] → Nothing to do with analytics. Counting adds no work to that request, and the shutdown flush keeps the hits from before the sleep.

## Migration Plan

- **Deploy:** there is no data to migrate.
  1. On Render, set `GOATCOUNTER_TOKEN` (an API token from the GoatCounter site settings, with permission to record page views) and `TRUST_PROXY`, then deploy the backend.
  2. On Netlify, set `VITE_GOATCOUNTER_URL=https://jclcheck.goatcounter.com/count`, preferably scoped to the production context, then deploy the frontend.
- **Rollback:**
  - Unsetting `VITE_GOATCOUNTER_URL` on Netlify and rebuilding stops all browser counting.
  - Unsetting `GOATCOUNTER_TOKEN` on Render stops backend counting.
  - Neither needs a code change.

## Open Questions

- Does `count.js` deliver hits sent during `pagehide` reliably, and does an empty `referrer` in `count()` suppress the referrer on later page views? Both will be checked against the live dashboard after the first deploy. Neither changes the specs: if delivery is unreliable, the summary is sent only on `visibilitychange`.
- What `TRUST_PROXY` value gives the real client IP on Render? Start with `1`. After deploying, send a curl request to `https://jclcheck.onrender.com/api/validate`, and compare the country recorded for `api/validate/direct` with your own. Also check that a request with a made-up `X-Forwarded-For: 1.2.3.4` header isn't counted as `1.2.3.4`. Adjust the hop count if either is wrong; only the setting changes, not the code.
- Confirm the GoatCounter API field names (`hits`, `path`, `title`, `event`, `ip`, `user_agent`) against GoatCounter's API documentation while building task 2.2. If a name differs, only the sender's mapping changes.
