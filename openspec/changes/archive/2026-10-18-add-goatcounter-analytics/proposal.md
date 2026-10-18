# Proposal

## Why

There is no way to know how many people use JCLcheck, where they come from, or which features and diagnostics matter to them, so choosing what to build next is guesswork. Features.md feature 2 asks for GoatCounter analytics straight after the test suite, so every later feature is measured from the day it ships. Counting must stay anonymous: no cookies, no personal data, and nothing from the user's JCL.

## What Changes

- **Loading GoatCounter:** the frontend loads GoatCounter's `count.js` from `https://gc.zgo.at/count.js`, counting to the address in `VITE_GOATCOUNTER_URL` (`https://jclcheck.goatcounter.com/count`, set on Netlify). When the variable isn't set, nothing loads.
  - It loads only on the production hostname (`jclcheck.xyz`), and never when the browser sends Do Not Track or Global Privacy Control.
  - It's loaded from a small analytics module rather than a static tag in `index.html`, so those checks can run first.
- **Page views:** each route change counts one page view, with only the `zos`, `jes`, `ref` and `utm_*` query parameters kept. A new catch-all route shows a "page not found" page, counted as `/404`.
- **Events for today's features:**
  - landing, About, navbar and footer calls to action, FAQ opens and outbound links
  - explicit checks, samples, Clear, help and pastes
  - diagnostics seen, fixed and clicked, by code
  - API failures
  - a visit summary in buckets: checks, largest JCL, time, response time and the final result
- **One allowed list:** every event name and detail comes from a single allowed list. It already includes the events later features will send, and anything not on it is dropped.
- **Direct API use:** the backend, hosted on Render at `https://jclcheck.onrender.com`, counts requests that don't come from the workbench as `api/validate/direct`. GoatCounter gets the user agent and client IP for the country, and drops the IP. Requests are skipped when they carry `X-JCLcheck-Client: workbench`, `DNT: 1` or `Sec-GPC: 1`. Hits are sent in batches every 10 seconds with the `GOATCOUNTER_TOKEN` token, and never slow down a response. Queued hits are flushed when Render stops the service, for example when its free tier spins it down.
- **`POST /api/usage`:** a new backend endpoint that accepts up to 30 allowed `cli/…` events and forwards them to GoatCounter. It's ready for the CLI's opt-in counting in feature 38.
- **Privacy copy:** the FAQ (and so its structured data), help, the landing trust line and Spec.md say what is counted, and say that JCL is never stored or counted.
- **Supporting changes:**
  - The backend's `src/index.js` exports the Express app and only starts listening when run directly, so the API can be tested.
  - The API client sends the workbench header and reports the HTTP status of failures.

## Capabilities

### New Capabilities
- `usage-analytics`: anonymous usage counting.
  - **Frontend:** what is counted and when, the allowed list of events, Do Not Track, Global Privacy Control and hostname gating, page views and the 404 route, visit summaries, and the guarantee that no JCL or personal data leaves the browser.
  - **Backend:** how direct API use and CLI usage reports are counted without slowing the API.

### Modified Capabilities
- `regression-testing`: the "Frontend test command" requirement gains a scenario. The frontend tests must never load the real GoatCounter script, in the same way they already never make real API calls.

## Impact

- **Frontend:**
  - New modules: `src/analytics.js` and `src/pages/NotFound.vue`.
  - Edited: `router.js` (page views and the catch-all route), `api.js` (header and status), `Workbench.vue`, `Editor.vue` (a `paste` event), `Landing.vue`, `About.vue`, `Navbar.vue`, `Footer.vue`, `HelpModal.vue` and `faq.js`.
  - New tests in `frontend/tests/`.
- **Backend:**
  - New module: `src/analytics.js`, which holds the queue, the batch sender and the usage allowed list.
  - `src/index.js` changes: the direct-use middleware, the `/api/usage` route, a `TRUST_PROXY` setting so `req.ip` is the real client behind Render's proxy, a flush on shutdown, and exporting the app.
  - New tests in `backend/test/`.
- **Configuration:**
  - New frontend build variable: `VITE_GOATCOUNTER_URL`, set on Netlify.
  - New backend environment variables, set on Render: `GOATCOUNTER_TOKEN`, which turns sending on, and `TRUST_PROXY`.
  - The backend's GoatCounter site address (`https://jclcheck.goatcounter.com`) is fixed in code, since the token only works for that site.
- **Dependencies:** none. The backend uses Node's built-in `fetch`.
- **Docs:** README, Spec.md, and Features.md feature 2. The Features.md changes:
  - the setup says the script is loaded from code and also gated on hostname, Do Not Track and Global Privacy Control
  - the CLI side of counting moves to feature 38
- **Out of scope:**
  - **Events for features that aren't built yet:** they are on the allowed list now, but each feature sends its own when it's built.
  - **The CLI's own counting code:** it comes with feature 38.
