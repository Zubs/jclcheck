# JCLcheck — JCL Validation Workbench

A standalone, SaaS-style JCL validator built for **learning JCL and training new
mainframe developers**. No mainframe connection required — everything runs as
a self-contained lexer → parser → AST → rule-engine pipeline in Node.js, with
a Vue 3 frontend.

```
jcl-checker/
├── backend/     Node.js/Express validation engine + HTTP API
│   ├── src/
│   │   ├── lexer.js           physical lines → logical statements (columns, continuations, in-stream data, JES)
│   │   ├── paramTokenizer.js  operand string → positional/keyword params (paren/quote aware)
│   │   ├── parser.js          statements → AST (jobs, steps, DDs, PROCs, IFs, job groups) + order checks
│   │   ├── conditions.js      IF/WHEN condition parser
│   │   ├── ast.js             AST node factories
│   │   ├── keywords.js        keyword, statement and value tables from the IBM JCL Reference
│   │   ├── valueRules.js      reusable value rules (enum, integer, list, ...) and their checker
│   │   ├── levels.js          supported z/OS levels and JES choice
│   │   ├── library.js         catalogued PROCs and INCLUDE members supplied by the user
│   │   ├── errors.js          central diagnostic catalog (code, message, suggestion)
│   │   ├── validator.js       pipeline orchestrator
│   │   ├── rules/
│   │   │   ├── ddRules.js     DD data sources, duplicates, delimiters, PATH
│   │   │   ├── paramRules.js  keywords, values, positionals, JCLLIB, NOTIFY, dataset names
│   │   │   ├── procRules.js   PROC resolution, symbolic (&SYM) validation, DD-override matching
│   │   │   ├── ifRules.js     step references in IF conditions
│   │   │   ├── jesRules.js    JES2 and JES3 control statements
│   │   │   └── groupRules.js  JES2 job groups
│   │   └── index.js           Express API (POST /api/validate, GET /api/levels, POST /api/usage)
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
        │   ├── Editor.vue           source editor: highlighting, underlines, gutter markers, cursor position
        │   ├── LibraryPanel.vue     catalogued PROCs and INCLUDE members pasted by the user
        │   ├── ErrorPanel.vue       diagnostics list (code, message, plain-English fix)
        │   ├── PfBar.vue            3270-style PF-key bar (F1 Help, F5 Validate, F6 Share, F9 Sample, F12 Clear)
        │   └── HelpModal.vue        in-app documentation for learners
        ├── highlight.js             JCL syntax highlighting for the editor
        ├── share.js                 shareable links (compressed JCL after #jcl=)
        ├── diagnosticCodes.js       every diagnostic code, explained in Help
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

## Command line and CI

`backend/bin/jclcheck.js` checks JCL files from a terminal or a pipeline. It
uses only Node's built-in modules and the validator (never Express), so its
results are the same as the API's.

```bash
cd backend
node bin/jclcheck.js ../jcl/*.jcl                      # file:line:column  severity  code  message
node bin/jclcheck.js jcl/*.jcl --format sarif > jclcheck.sarif
```

| Option | What it does |
|---|---|
| `--zos <level>`, `--jes <JES2\|JES3>` | The z/OS level and JES to check against. |
| `--library <dir>` | Catalogued PROCs and INCLUDE members, one file per member (`MYPROC.jcl`). A subdirectory named like a library (`MY.PROCS.JCL/`) is that library. |
| `--profile <file>` | A site profile, as JSON (see the API section). |
| `--format text\|json\|sarif` | Text (the default), JSON (`{ files: [{ file, diagnostics, stats }] }`) or SARIF 2.1.0. |
| `--max-warnings <n>` | Also fail when there are more warnings than this. |

It exits with 0 when there are no errors, 1 when a file has an error or there
are too many warnings, and 2 when it can't run (a bad option, or a file it
can't read; the other files are still checked). Suppressed diagnostics aren't
printed in text and are marked `inSource` in SARIF.

GitHub Actions, showing each diagnostic on its line of the pull request:

```yaml
name: JCL
on: [pull_request]
jobs:
  jclcheck:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: actions/checkout@v4
        with:
          repository: Zubs/jclcheck
          path: .jclcheck
      - run: node .jclcheck/backend/bin/jclcheck.js "jcl/**/*.jcl" --format sarif > jclcheck.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: jclcheck.sarif
```

Usage counting is off unless you opt in with `JCLCHECK_TELEMETRY=1` or
`--telemetry`, and `DO_NOT_TRACK=1` always turns it off. An opted-in run sends
one small list of events (the version, Node major version, OS, CI system,
number of files, result, format, options used and diagnostic codes, never any
JCL or file names) to `POST /api/usage`, with a 1-second limit; a failure
changes nothing. `JCLCHECK_TELEMETRY=debug` prints that list and sends nothing.
`JCLCHECK_API` points it at another API.

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

- **Reading lines**: 80-column records as z/OS reads them (columns 1-71 hold
  the statement, a mark in column 72 continues a comment, 73-80 are ignored),
  `//*` comments, continuations (trailing comma, open parenthesis, or a
  quoted string resuming in column 16), unterminated quotes, overlong lines,
  and in-stream data (`DD *` and `DD DATA`, with `DLM=` delimiters).
- **z/OS level and JES**: every check is made against a z/OS release (2.3 to
  3.2, default 3.2) and JES2 or JES3 (JES3 only at 2.5 and earlier). JES2
  (`/*ROUTE`, `/*JOBPARM`, ...) and JES3 (`//*MAIN`, `//*FORMAT`, ...)
  control statements are recognised and checked.
- **Structure**: several jobs per stream, each checked on its own (`//`
  ends a job); JOB, EXEC and DD order; JCLLIB and NOTIFY placement; balanced
  IF/ENDIF and PROC/PEND; IF conditions parsed, with their step references
  checked and their THEN/ELSE steps recorded; JES2 job groups (JOBGROUP to
  ENDGROUP), with dependency loops reported.
- **DD statements**: one data source per DD (DSN, DUMMY, SYSOUT, in-stream
  data, PATH, or a SUBSYS/DDNAME/new temporary dataset), z/OS UNIX file
  keywords, duplicate DD names (a warning), and a note for JCL sent to the
  internal reader.
- **Keywords and values**: JOB, EXEC, DD, JCLLIB and NOTIFY keywords against
  tables from the IBM JCL Reference, with "did you mean" suggestions;
  positional parameter limits; keywords qualified with a procedure step
  (`COND.STEP1=`); value rules (CLASS, TYPRUN, PRTY, MSGLEVEL, NOTIFY, EMAIL
  and more) alongside the DISP, SPACE, DCB, REGION, TIME and dataset name
  checks, which understand members, generations, temporary and quoted names.
- **Procedures and INCLUDE**: in-stream PROCs are resolved and checked
  (symbolic parameters, DD overrides, procedure steps). Catalogued procedures
  and INCLUDE members are found and checked when supplied in the `library`
  (the workbench's Library panel), in the job's JCLLIB order.
- **Dataset flow**: each dataset is followed through the job's steps,
  including the steps of called PROCs: a temporary dataset read before any
  step creates or passes it, a pass no later step reads, a dataset
  catalogued twice, a read after a delete, and referbacks (`*.STEP.DD`) to
  nothing. Known symbol values are filled in; names that stay symbolic and
  relative generations are skipped. The workbench's DATASETS tab shows the
  flow as a grid.
- **Suppressions and site profile**: `//* JCLCHECK OFF-NEXT code[,code]`
  hides those codes on the next statement, and `//* JCLCHECK OFF code` hides
  them until `//* JCLCHECK ON code` or the end of the job. Suppressed
  diagnostics come back with `suppressed: true` and aren't counted. A site
  `profile` adds name patterns, allowed values, prefixes for new datasets,
  extra keywords and per-code severities (`JCLN002` for a broken rule).

Every diagnostic carries `{ code, severity, line, column, length, message,
suggestion, source }`, plus `member` when it was found inside a library
member. See `backend/src/errors.js` for the full catalog: `JCLL` reading
lines, `JCLP` structure, `JCLO` order, `JCLD` DD statements, `JCLK`
keywords, `JCLS` values, `JCLN` names, `JCLR` procedures and INCLUDE, `JCLJ`
JES statements, `JCLC` IF conditions, `JCLG` job groups, `JCLF` dataset
flow, `JCLX` suppressions. The workbench's
Help lists every code with its default severity, which each catalog entry sets.

## API

| Endpoint | What it does |
|---|---|
| `POST /api/validate` | Checks `source`. Optional: `zosLevel` (`2.3`-`3.2`, default `3.2`), `jes` (`JES2` or `JES3`; JES3 only at 2.5 and earlier) `library` (up to 50 `{ dsn, member, source }` entries) and `profile` (a site profile, below). Unknown levels, JES values, bad library entries or an invalid profile get a 400 response that says why. |
| `GET /api/levels` | The supported levels, oldest first, as `{ level, jes3 }`, with `defaultLevel` and `defaultJes`. |
| `GET /api/health` | `{ "ok": true }` |
| `POST /api/usage` | Opt-in CLI usage counts (see Analytics). |

The response from `/api/validate` is `{ diagnostics, ast, datasets, stats,
zosLevel, jes }`. `datasets` has an entry for each job that names a dataset:
`{ job, steps, datasets }`, where `steps` are the job's steps in order (a step
calling a PROC appears as `STEP.PROCSTEP`) and each dataset is `{ name,
temporary, touches }`, with a touch `{ step, dd, line, column, actions }` for
each DD naming it. Actions are `N` new, `R` read, `M` mod, `P` pass and `D`
delete. `ast.jobs` lists every job in the stream (it replaced the single
`ast.job` when several jobs per stream were supported), `ast.procs` the
procedures and `ast.jobGroups` the JES2 job groups. `stats` has `errors`,
`warnings`, `info`, `suppressed`, `statementCount`, `jobCount`, `stepCount`
(across all jobs), `procCount` and `valid` (no errors); suppressed diagnostics
are only counted in `suppressed`.

A site profile looks like this. Every field is optional; patterns use `*`
for any run of characters and `%` for one:

```json
{
  "names": { "job": ["AR*"], "step": "STEP%%", "dd": "*" },
  "allowed": { "CLASS": ["A", "B"], "MSGCLASS": ["X"] },
  "dsnPrefixes": ["AR", "SYS1"],
  "extraKeywords": { "EXEC": ["LOCALKW"] },
  "severity": { "JCLS014": "off", "JCLK001": "error" }
}
```

Example request (`test/readme.test.js` checks it against the real validator):

```json readme-request
{
  "source": "//PAYROLL JOB (ACCT),'J SMITH',CLASS=A\n//STEP1 EXEC PGM=IEFBR14,REGON=4M\n",
  "zosLevel": "2.5"
}
```

Response, without `ast`:

```json readme-response
{
  "diagnostics": [
    {
      "code": "JCLK001",
      "severity": "warning",
      "line": 2,
      "column": 26,
      "length": 1,
      "message": "'REGON' is not a recognized keyword for a EXEC statement.",
      "suggestion": "Did you mean 'REGION'?",
      "source": "validator"
    }
  ],
  "datasets": [],
  "stats": {
    "errors": 0,
    "warnings": 1,
    "info": 0,
    "suppressed": 0,
    "statementCount": 2,
    "jobCount": 1,
    "stepCount": 1,
    "procCount": 0,
    "valid": true
  },
  "zosLevel": "2.5",
  "jes": "JES2"
}
```

## Known limitations (by design, given no mainframe access)

- Datasets can't be verified to exist, and catalogued procedures and INCLUDE
  members are checked only when they are pasted into the Library panel;
  otherwise a call to a PROC that isn't in-stream is a warning.
- IF/THEN/ELSE conditions are checked and their branches recorded, but no
  return codes are simulated, so every step is checked whichever branch it is in.
- Symbols are only resolved for in-stream and supplied procedures; values that
  depend on them can't be checked.

## Extending it

- Add more keyword/value tables in `keywords.js`.
- Add new rule modules under `rules/` and wire them into `validator.js`.
- Add new diagnostic codes to the `CATALOG` in `errors.js` — message and
  suggestion are plain functions of the diagnostic's data, so every new rule
  gets a human-readable explanation for free.
