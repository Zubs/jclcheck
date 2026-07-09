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
│   └── test/run.js            fixture-based smoke tests
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

Backend tests (fixture-based, no test framework dependency):

```bash
cd backend && npm test
```

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
- This was scaffolded by hand rather than generated from an ANTLR grammar,
  but the statement/keyword tables are structured so a real ANTLR-based JCL
  grammar (several exist on GitHub) could replace `lexer.js`/`parser.js`
  without touching the rule engine or frontend.
