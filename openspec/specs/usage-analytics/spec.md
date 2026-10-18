# usage-analytics Specification

## Purpose

Counts how JCLcheck's site, workbench and API are used with GoatCounter, anonymously and without cookies, so the owner can decide what to build next, while never sending the user's JCL or any personal data.

## Requirements

### Requirement: Counting only where it is wanted
The site SHALL load GoatCounter and count only when it was built with a GoatCounter count address (`VITE_GOATCOUNTER_URL`) and is served from `jclcheck.xyz`. It SHALL NOT load it or count anything when the browser reports Do Not Track or Global Privacy Control. Every part of the site SHALL work the same whether or not counting is on, or the script is blocked.

#### Scenario: Production visit
- **WHEN** the site is built with `VITE_GOATCOUNTER_URL=https://jclcheck.goatcounter.com/count`, and a visitor without Do Not Track or Global Privacy Control opens `https://jclcheck.xyz/`
- **THEN** GoatCounter's script is loaded from `https://gc.zgo.at/count.js` with that count address

#### Scenario: No count address configured
- **WHEN** the site is built without `VITE_GOATCOUNTER_URL`
- **THEN** the script isn't loaded and nothing is counted, even on `jclcheck.xyz`

#### Scenario: Local or preview site
- **WHEN** the site is opened on `localhost` or a Netlify deploy preview address
- **THEN** the script isn't loaded and nothing is counted

#### Scenario: Do Not Track
- **WHEN** the browser reports `navigator.doNotTrack` as `"1"`
- **THEN** the script isn't loaded, nothing is counted, and the workbench still checks JCL normally

#### Scenario: Global Privacy Control
- **WHEN** the browser reports `navigator.globalPrivacyControl` as `true`
- **THEN** the script isn't loaded and nothing is counted

#### Scenario: Script blocked
- **WHEN** an ad blocker stops the script from loading
- **THEN** every page and workbench feature works, and no error appears in the console

### Requirement: One page view per page
Each page shown SHALL be counted exactly once, including the first. The counted path SHALL keep only the `zos`, `jes`, `ref` and `utm_*` query parameters and SHALL never include the part after `#`.

#### Scenario: Moving between pages
- **WHEN** a visitor opens `/`, then goes to `/about`, then to `/app` inside the site
- **THEN** exactly three page views are counted: `/`, `/about` and `/app`

#### Scenario: Unwanted query parameters and fragment
- **WHEN** a visitor opens `/app?zos=3.1&utm_source=x&name=SECRET#jcl=abc`
- **THEN** the counted path is `/app?zos=3.1&utm_source=x`

### Requirement: Page not found
An address that matches no page SHALL show a "page not found" page with a link back to the site, and SHALL be counted as the path `/404`.

#### Scenario: Unknown address
- **WHEN** a visitor opens `/no-such-page`
- **THEN** a "page not found" page is shown with a link to `/`, and a page view for `/404` is counted

### Requirement: Events come only from an allowed list
Every event SHALL be named `area/action/detail` and have a readable title. An event name or detail that isn't on the allowed list SHALL be dropped without sending anything. The list SHALL include the events of features not yet built, so they can be sent when those features ship.

#### Scenario: Allowed event
- **WHEN** the workbench loads the broken sample
- **THEN** the event `sample/broken` is counted with a readable title

#### Scenario: Unknown detail
- **WHEN** code asks to count `sample/MY.SECRET.DSN`
- **THEN** nothing is sent

#### Scenario: Every event in the code is on the list
- **WHEN** the tests check every event the site can send
- **THEN** each one is on the allowed list

### Requirement: Site navigation events
The site SHALL count which call to action opens the workbench, the About call to action on the landing page, which FAQ question is opened, and which outbound link is followed.

#### Scenario: Launch from the hero
- **WHEN** a visitor clicks "Launch the workbench" in the landing page hero
- **THEN** `cta/launch/hero` is counted

#### Scenario: FAQ question opened
- **WHEN** a visitor opens the second FAQ question
- **THEN** `faq/open/2` is counted, and closing it counts nothing

#### Scenario: Outbound link
- **WHEN** a visitor follows the GitHub repository link in the navbar
- **THEN** `outbound/github-repo` is counted

### Requirement: Workbench action events
The workbench SHALL count each explicit check, sample loaded, clear, help opened and paste, with how it was triggered or a size bucket. Automatic checks after typing SHALL NOT be counted one by one.

#### Scenario: Explicit check
- **WHEN** the user clicks the VALIDATE button
- **THEN** `check/button` is counted

#### Scenario: Automatic checks
- **WHEN** the user types and 30 automatic checks run
- **THEN** no `check/` event is counted for them

#### Scenario: Paste
- **WHEN** the user pastes 12 lines of JCL
- **THEN** `editor/paste/11-50` is counted, and none of the pasted text is sent

### Requirement: Diagnostic events
The workbench SHALL count the first time each diagnostic code appears in a visit, the first time a code goes away after the user edits the text, and each click on a diagnostic, using only the code. A code that goes away because the user cleared the editor or loaded a sample SHALL NOT count as fixed.

#### Scenario: Seen once per visit
- **WHEN** `JCLK001` appears in three checks during one visit
- **THEN** `diag/seen/JCLK001` is counted once

#### Scenario: Fixed by editing
- **WHEN** `JCLK001` is present and disappears after the user edits the JCL
- **THEN** `diag/fixed/JCLK001` is counted once for the visit

#### Scenario: Gone because of a sample
- **WHEN** `JCLK001` disappears because the user loaded another sample
- **THEN** no `diag/fixed/JCLK001` is counted

#### Scenario: Diagnostic clicked
- **WHEN** the user clicks a `JCLD002` entry in the diagnostics panel
- **THEN** `diag/click/JCLD002` is counted

### Requirement: API problem events
The workbench SHALL count a failed check as `api/unreachable` when the API can't be reached, or as `api/error/<status>` when it answers with an error status.

#### Scenario: Server error
- **WHEN** a check gets a 500 response
- **THEN** `api/error/500` is counted

#### Scenario: Network failure
- **WHEN** a check can't reach the API at all
- **THEN** `api/unreachable` is counted

### Requirement: Visit summary
When the user leaves the workbench or hides the page, the workbench SHALL count one visit summary, using buckets instead of exact numbers. It SHALL cover how many checks ran, the largest JCL checked in lines, time spent, the typical API response time, and whether the last check was clean, had warnings, or had errors. It SHALL be sent at most once per visit.

#### Scenario: Summary buckets
- **WHEN** a visit runs 30 checks, its largest JCL is 11 lines, it lasts 3 minutes, its median response time is 120 ms, and the last check had errors
- **THEN** `visit/checks/21-100`, `visit/lines/11-50`, `visit/time/1-5m`, `visit/latency/0-250ms` and `visit/end/errors` are counted

#### Scenario: Bucket boundaries
- **WHEN** the largest JCL checked is 10 lines
- **THEN** `visit/lines/1-10` is counted, and at 11 lines `visit/lines/11-50`

#### Scenario: Hidden then closed
- **WHEN** the page is hidden and then closed in the same visit
- **THEN** the summary is counted once

### Requirement: Nothing from the JCL or the person is sent
No page view or event SHALL contain JCL text or any part of it, the part of the address after `#`, cookies, or any visitor ID stored in the browser.

#### Scenario: Marker in the JCL
- **WHEN** the user checks, edits and pastes JCL containing a unique marker string, and clicks its diagnostics
- **THEN** the marker appears in nothing sent to GoatCounter

#### Scenario: No cookies or stored IDs
- **WHEN** a visit is counted
- **THEN** the site sets no cookie and stores no visitor ID

### Requirement: Counting direct API use
The backend SHALL count each request to the check API that doesn't carry the `X-JCLcheck-Client: workbench` header as `api/validate/direct`, with the result as `api/result/<ok|bad-request|error>`. It SHALL pass the client's user agent and real IP address, not the hosting proxy's, so GoatCounter can record the browser or tool and the country. Requests with `DNT: 1` or `Sec-GPC: 1` SHALL NOT be counted.

#### Scenario: Request from curl
- **WHEN** `curl` posts JCL to `/api/validate` and gets a 200 response
- **THEN** `api/validate/direct` and `api/result/ok` are counted once each, with curl's user agent and the client's IP

#### Scenario: Request from the workbench
- **WHEN** the workbench posts JCL with `X-JCLcheck-Client: workbench`
- **THEN** the backend counts nothing for it

#### Scenario: Request through the hosting proxy
- **WHEN** a direct request reaches the backend through Render's proxy with `TRUST_PROXY` set for it
- **THEN** the counted IP is the client's address, not the proxy's

#### Scenario: Request with Global Privacy Control
- **WHEN** a direct request carries `Sec-GPC: 1`
- **THEN** the backend counts nothing for it

### Requirement: Backend counting never affects the API
The backend SHALL queue its hits and send them to GoatCounter in batches about every 10 seconds, using the `GOATCOUNTER_TOKEN` token. When the token isn't set, it SHALL send nothing. A slow, failing or unreachable GoatCounter SHALL NOT delay or change any API response, and failed batches SHALL be dropped.

#### Scenario: No token
- **WHEN** the backend runs without `GOATCOUNTER_TOKEN`
- **THEN** no request is ever made to GoatCounter

#### Scenario: GoatCounter down
- **WHEN** GoatCounter doesn't answer
- **THEN** `/api/validate` responds in its normal time with its normal result

#### Scenario: Batching
- **WHEN** five direct requests arrive within 10 seconds
- **THEN** their hits are sent together in one request to GoatCounter

#### Scenario: Service stopped
- **WHEN** the host stops the backend (for example Render spinning down an idle free-tier service) with hits still queued
- **THEN** the queued hits are sent before the process exits, waiting no more than 5 seconds

### Requirement: Usage reports from the CLI
The backend SHALL accept `POST /api/usage` with a list of up to 30 events whose names are on the CLI allowed list (`cli/…`), and forward them to GoatCounter with the client's user agent and IP. It SHALL reject any other name, or more than 30 events, with a 400 response, and SHALL NOT count requests carrying `DNT: 1` or `Sec-GPC: 1`.

#### Scenario: Valid report
- **WHEN** `/api/usage` receives `cli/run`, `cli/os/linux` and `cli/result/clean`
- **THEN** it answers 202 and queues those three events

#### Scenario: Unknown event
- **WHEN** `/api/usage` receives `cli/run` and `page/secret`
- **THEN** it answers 400, naming `page/secret`, and queues nothing

#### Scenario: Too many events
- **WHEN** `/api/usage` receives 31 events
- **THEN** it answers 400 and queues nothing

### Requirement: Privacy copy says what is counted
The FAQ (and so its structured data), help, the landing page trust line and Spec.md SHALL say that the site counts anonymous usage with GoatCounter, with no cookies and no personal data. They SHALL list what is counted and respect for Do Not Track and Global Privacy Control, and SHALL say that JCL is never stored or counted.

#### Scenario: FAQ answer
- **WHEN** a visitor reads the FAQ
- **THEN** one question explains the anonymous counting, what is counted, and that JCL is never stored or counted, and the page's FAQ structured data contains the same text
