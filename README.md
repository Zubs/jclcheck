# JCLcheck — JCL Validation Workbench

A standalone, SaaS-style JCL validator built for **learning JCL and training new
mainframe developers**. No mainframe connection required — everything runs as
a self-contained lexer → parser → AST → rule-engine pipeline in Node.js, with
a Vue 3 frontend.

```
jcl-checker/
├── backend/     Node.js/Express validation engine + HTTP API
│   ├── src/
│   │   ├── lexer.js           physical lines → logical statements (continuations, comments)
│   │   ├── paramTokenizer.js  operand string → positional/keyword params (paren/quote aware)
│   │   ├── parser.js          statements → AST (Job/Step/DD/Proc/If), ordering + structural checks
│   │   ├── ast.js             AST node factories
│   │   ├── keywords.js        keyword/value tables distilled from the IBM JCL Reference
│   │   ├── errors.js          central diagnostic catalog (code, message, suggestion)
│   │   ├── validator.js       pipeline orchestrator
│   │   ├── rules/
│   │   │   ├── ddRules.js     duplicate DD names, data-source conflicts
│   │   │   ├── paramRules.js  keyword legality, required params, DISP/SPACE/DCB/REGION/TIME/DSN syntax
│   │   │   └── procRules.js   PROC resolution, symbolic (&SYM) validation, DD-override matching
│   │   └── index.js           Express API (POST /api/validate)
│   └── test/                  regression suite (node:test): exact diagnostics for every fixture
│       ├── fixtures/          .jcl fixtures + .expected.json results (fixtures/nick/: Nick's review examples)
│       ├── samples/           expected results for the workbench samples
│       ├── helpers/           comparison, fixture discovery and todo rules
│       └── inspect.js         prints full validator output (npm run inspect)
└── frontend/    Vue 3 + Vite SPA (Vue Router, 3 pages)
    └── src/
        ├── App.vue                 root shell (just <router-view/>)
        ├── router.js                routes: / (landing), /about, /app (workbench)
        ├── style.css                bright marketing theme (default) + dark
        │                            `.workbench-theme` override for the app screen
        ├── pages/
        │   ├── Landing.vue          marketing homepage — hero, features, how it works
        │   ├── About.vue            about page (bio, other projects, where I've worked)
        │   └── Workbench.vue        the actual JCLCHECK validation workbench
        ├── components/
        │   ├── marketing/           Navbar, Footer, FeatureCard, CodePreview (hero visual)
        │   ├── Editor.vue           line-numbered source editor w/ diagnostic gutter markers
        │   ├── ErrorPanel.vue       diagnostics list (code, message, plain-English fix)
        │   ├── PfBar.vue            3270-style PF-key action bar (F1 Help / F5 Validate / F9 Sample / F12 Clear)
        │   └── HelpModal.vue        in-app documentation for learners
        └── samples.js               bundled example JCL (clean / broken / proc+symbolics)
    └── tests/                       component tests (Vitest + Vue Test Utils + jsdom), mirroring src/
```

The site has three pages:
- **`/`** — the marketing landing page (bright theme): what JCLcheck is, what it checks, how the pipeline works.
- **`/about`** — a personal about page.
- **`/app`** — the actual JCLCHECK Validation Workbench (dark 3270-terminal theme), where the
  editor/diagnostics/PF-key bar from the original build live unchanged.

## Running it

```bash
# Terminal 1 — API
cd backend
npm install
npm start          # http://localhost:4000

# Terminal 2 — UI
cd frontend
npm install
npm run dev         # http://localhost:5173 (proxies /api to :4000)
```

## Analytics

The site counts anonymous usage with [GoatCounter](https://www.goatcounter.com): page views, where visits come from, browser, device size, country, which features are used, and which error codes appear. It sets no cookies, keeps no personal data, and never sends anything from the JCL. Nothing is counted when the browser sends Do Not Track or Global Privacy Control. Every event and the details it may carry are listed in `frontend/src/analyticsEvents.js`.

Counting is off unless these are set:

| Variable | Where | What it does |
|---|---|---|
| `VITE_GOATCOUNTER_URL` | Frontend build (Netlify) | GoatCounter count address, `https://jclcheck.goatcounter.com/count`. When it isn't set, the script is never loaded. Even when it is set, the site only counts when served from `jclcheck.xyz`, so local runs and deploy previews are never counted. |
| `GOATCOUNTER_TOKEN` | Backend (Render) | GoatCounter API token with the permission to record page views. The backend uses it to count requests to `/api/validate` that don't come from the workbench, and CLI reports sent to `POST /api/usage`. When it isn't set, the backend sends nothing. |
| `TRUST_PROXY` | Backend (Render) | Number of proxies in front of the API, so the client's real IP (used only for the country) is read from `X-Forwarded-For`. Start with `1` on Render. Leave it unset for local runs. |

To check `TRUST_PROXY` after a deploy, send a request with `curl` to `https://jclcheck.onrender.com/api/validate`. Then confirm the GoatCounter dashboard shows your own country for `api/validate/direct`, and that a request with a made-up `X-Forwarded-For: 1.2.3.4` header isn't counted as `1.2.3.4`. Adjust the number if either is wrong.

Hits from the backend are sent in batches every 10 seconds, and when the service is stopped, for example when Render spins it down. GoatCounter being slow or down never delays an API response.

## Tests

### Backend

The backend tests use Node's built-in test runner (Node 22 or later) and need no extra packages.

```bash
cd backend
npm test           # exits non-zero if any test fails
npm run lint       # ESLint: bugs and formatting (npm run lint:fix fixes most)
npm run inspect    # prints full validator output (with messages and fixes) for the bundled fixtures
```

Each fixture is checked against its exact diagnostics: code, severity, line and column. A missing or extra diagnostic fails the test, and so does a diagnostic that moves by one column. Messages and fixes aren't compared, so their wording can change freely. The workbench samples are read straight from `frontend/src/samples.js` and checked the same way, against `test/samples/<name>.expected.json`.

To add a fixture, put two files side by side anywhere under `backend/test/fixtures/`:

- `my-case.jcl`: the JCL
- `my-case.expected.json`: what the validator should report

```json
{
  "source": "Where this example came from",
  "valid": false,
  "diagnostics": [
    { "code": "JCLD002", "severity": "error", "line": 3, "column": 1 }
  ]
}
```

Only `diagnostics` is required. A fixture for behaviour that isn't built yet adds `"todo": { "feature": 12, "reason": "..." }`, using the feature number from `Features.md`. A todo fixture that still fails is reported as todo and doesn't fail the run. Once it passes, the run fails until the `todo` is removed, so the list of known gaps stays accurate. `"provisional": true` marks a result that waits on an open question in `Features.md`.

### Frontend

The frontend tests use Vitest with Vue Test Utils in jsdom. The API is mocked, so they don't need the backend, and any real network call fails the test.

```bash
cd frontend
npm test           # runs once and exits non-zero if any test fails
npm run lint       # ESLint: bugs and formatting, including .vue files (npm run lint:fix fixes most)
npx vitest         # watch mode
```

Tests live in `frontend/tests/`, mirroring `src/`. A known bug that a later feature in `Features.md` will fix is written as `test.fails('... (feature N)', ...)`. The test describes the correct behaviour, so it fails today, and Vitest counts it as passing. Once the bug is fixed, the test passes and the run fails until `.fails` is removed.

## What's validated

- **Lexing**: `//` record format, comment lines (`//*`), continuation lines
  (trailing comma or open parenthesis), unterminated quotes, 80-column
  overflow, in-stream data (`DD *` / `DD DATA` through the delimiter).
- **Parsing / structure**: statement recognition (JOB, EXEC, DD, PROC, PEND,
  SET, IF/THEN/ELSE/ENDIF, INCLUDE), unmatched parentheses, IF/ENDIF and
  PROC/PEND balancing and nesting.
- **Ordering**: JOB must come first; EXEC before its DDs; only one JOB per job
  stream.
- **DD statements**: duplicate ddnames within a step; a DD must have exactly
  one data source (DSN / DUMMY / SYSOUT / instream data), not zero or several.
- **Keywords**: every keyword on JOB/EXEC/DD is checked against tables
  distilled from the IBM JCL Reference, with Levenshtein-distance "did you
  mean…" suggestions for typos. EXEC also checks for a required PGM or PROC.
- **Parameter value syntax**: DISP status/normal/abnormal dispositions, SPACE
  unit/quantities, DCB sub-parameters (RECFM/DSORG/LRECL/BLKSIZE), REGION
  (nnnnK/nnnnM), TIME, and DSN qualifier rules (≤8 chars/qualifier, ≤22
  qualifiers, ≤44 chars total, valid starting characters).
- **Procedures**: in-stream PROC/PEND bodies are parsed and validated the same
  way as the main job stream; EXEC PROC= calls are resolved against in-stream
  PROCs (unresolved calls are a *warning*, since they may be valid cataloged
  procedures this tool can't see); symbolic parameters (`&SYM`) referenced in
  a PROC body are checked against the PROC's declared defaults; DD overrides
  on a calling EXEC (bare `ddname` or `stepname.ddname`) are matched against
  the procedure's actual DDs.

Every diagnostic carries `{ code, severity, line, column, message,
suggestion }` — see `backend/src/errors.js` for the full catalog (grouped as
`JCLLxxx` lexer, `JCLPxxx` parser, `JCLOxxx` ordering, `JCLDxxx` DD rules,
`JCLKxxx` keyword rules, `JCLSxxx` value syntax, `JCLNxxx` name syntax,
`JCLRxxx` procedure resolution).

## Known limitations (by design, given no mainframe access)

- Cataloged procedures and datasets can't be verified to exist — calls to a
  PROC not defined in-stream are flagged as warnings, not hard errors.
- IF/THEN/ELSE conditional blocks are validated for balance/nesting but their
  bodies are not conditionally excluded from the AST (this is a static
  validator, not a JCL interpreter with a live symbol table).
- Continuation-column conventions (classic cols 4-16) are accepted loosely
  rather than strictly enforced, matching how most modern shops write JCL.

## Extending it

- Add more keyword/value tables in `keywords.js`.
- Add new rule modules under `rules/` and wire them into `validator.js`.
- Add new diagnostic codes to the `CATALOG` in `errors.js` — message and
  suggestion are plain functions of the diagnostic's data, so every new rule
  gets a human-readable explanation for free.
