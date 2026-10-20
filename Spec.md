# JCLcheck — Website Spec

**Website:** https://jclcheck.xyz
**Source:** https://github.com/Zubs/jclcheck
**Stage:** Live (free, v1)

---

## 1. Introduction

JCLcheck is a free online checker for JCL (Job Control Language), the language used to run batch jobs on IBM mainframes. It is built for students, new mainframe developers and anyone learning JCL who does not have access to a z/OS system to practise on. Users paste or type JCL into a workbench and see their mistakes straight away. Each problem shows its line and column, an error code, a plain-English explanation and a suggested fix.

No mainframe connection is needed. The checking is done by our own lexer, parser and rule engine, which are based on the IBM JCL Reference. The tool does static checking only. It does not run jobs or confirm that datasets or catalogued procedures exist.

The site should load fast and be easy to find through search engines for searches like "JCL checker online". It should look good when shared on social media. The workbench should feel like a mainframe terminal, while the marketing pages stay bright and approachable.

---

## 2. Product context

- **Audience:** People learning JCL, mainframe trainees, and developers who want a quick check before they submit a job.
- **Price:** Free. No sign-up, no accounts and no usage limits.
- **Privacy:** JCL is sent to the API to be checked, and is never stored or counted there. The user's draft, library and site profile are kept only in their own browser, and a shared link carries them inside the link itself, after the `#`, which is never sent to a server. Usage is counted anonymously with GoatCounter, with no cookies and no personal data: pages visited, where visits come from, browser, device size and country, which features are used, and which error codes appear. Nothing is counted when the browser sends Do Not Track or Global Privacy Control.
- **Ownership:** Zubair owns the code and the product.

---

## 3. User roles

| Role | Description |
|---|---|
| **User** | Anyone visiting the site. Can read the marketing pages, open the workbench, load sample JCL and check their own JCL. No account needed. |

There is no admin role. Content changes, such as samples, FAQ entries and rule tables, are made in the code.

---

## 4. Features

### 4.1 Marketing site

- **Landing page (`/`):** A hero section with a headline and a "Launch the workbench" button, plus an animated code preview. Also includes a "What it checks" grid with six feature cards, a four-step "How it works" section (Lex → Parse → Validate → Explain), an FAQ and a final call to action.
- **About page (`/about`):** A short bio of the author, why JCLcheck exists, and links to the author's portfolio and GitHub.
- **Navigation and footer:** Shared across the marketing pages, with links to the workbench, features, about page and GitHub repo.

### 4.2 Validation workbench (`/app`)

- **Editor:** Line numbers, syntax highlighting (name, operation, keywords, values, strings, comments, in-stream data, JES statements, column 72 and columns 73–80), a faint ruler at columns 72 and 80, and an underline under the exact text of each diagnostic, with its message on hover. The bar shows the cursor's line and column (column 72 and beyond stand out) and the selection length.
- **Keyword explanations:** Hovering over a keyword or value shows what it does, each part of its value in turn, the z/OS level it appeared in and a link to the IBM JCL Reference, below any diagnostic at the same place. Alt+K shows the same for the keyword at the cursor.
- **Live checking:** The JCL is checked about half a second after the user stops typing, once when the page loads, and straight away when the level or JES changes.
- **Diagnostics panel:** Lists every problem in line order, with severity, location (`L12:5`, or `MYPROC2 L3:5` inside a library member), code, message and a "FIX ›" suggestion. Clicking an entry jumps to it. The panel shows the z/OS level and JES the result was checked against.
- **Level and JES picker:** The header chooses the z/OS level (from `GET /api/levels`) and JES2 or JES3 (JES3 only at 2.5 and earlier). The choice is remembered and kept in the address (`?zos=&jes=`).
- **Library panel:** Holds catalogued procedures and INCLUDE members pasted by the user, each with its library and member name; they are found in the job's JCLLIB order and checked with the job.
- **Status indicator:** READY, VALIDATING, CLEAN — 0 ERRORS, the number of errors, API UNREACHABLE, or a note about a rejected library member name.
- **PF-key action bar and keys:** F1 Help (Alt+H), F4 Format (Alt+R, with a before-and-after preview and Undo), F5 Validate (Ctrl/⌘+Enter), F6 Share (Alt+L), F9 Sample (Alt+S), F12 Clear (Alt+C). Escape closes help. When F9 or F12 replaces typed text, an Undo notice brings it back for 5 seconds.
- **Drafts:** The JCL and library are saved in the user's browser and come back on the next visit. If storage is blocked, a one-line notice says so.
- **Sharing:** Share puts the JCL, library, level and JES in a link (compressed, after `#jcl=`), copied to the clipboard. Opening it shows the job without replacing the user's draft until they edit it, with "Back to my draft".
- **Profile panel:** PROFILE in the header edits the site profile with a form, or as JSON in a second view. It is saved with the draft and included in shared links; JSON that doesn't parse isn't used, and the panel says why. The diagnostics panel shows how many diagnostics JCLCHECK comments hid and lists them on request.
- **Datasets tab:** The diagnostics panel's DATASETS tab shows a grid with a row per dataset and a column per step, each cell showing how that step uses it (N new, R read, M mod, P pass, D delete). Clicking a cell goes to that DD.
- **Samples:** A clean job, a broken job with many typical mistakes, and a job with an in-stream PROC, symbolic parameters and DD overrides.

### 4.3 What is checked

| Area | Checks |
|---|---|
| **Reading lines** | 80-column records (columns 1–71 hold the statement, column 72 continues a comment, 73–80 are ignored), `//*` comments, continuations (including quoted strings resuming in column 16), unterminated quotes, overlong lines, in-stream data with `DLM=` |
| **Level and JES** | Keywords and statements available at the chosen z/OS level; JES2 and JES3 control statements |
| **Structure** | Several jobs per stream, JOB/EXEC/DD order, JCLLIB and NOTIFY placement, balanced IF/ENDIF and PROC/PEND, IF conditions and their step references, JES2 job groups |
| **DD statements** | One data source per DD (including PATH, SUBSYS, DDNAME and new temporary datasets), z/OS UNIX file keywords, duplicate DD names (a warning), and in-stream JCL sent to the internal reader, which is checked as a job of its own |
| **Keywords and values** | JOB, EXEC, DD, JCLLIB and NOTIFY keywords with "Did you mean…?", positional limits, keywords qualified with a procedure step, value rules (CLASS, TYPRUN, PRTY, MSGLEVEL, NOTIFY, EMAIL, …), DISP, SPACE, DCB, REGION, TIME and dataset names (members, generations, temporary and quoted names) |
| **Names** | Job, step, DD and procedure step names are 1–8 characters and start with a letter or `$ # @` |
| **Dataset flow** | Each dataset followed through the job's steps and called PROCs: temporary datasets read before they exist, passes nobody reads, datasets catalogued twice, reads after a delete, and referbacks to nothing |
| **Suppressions and site profile** | `//* JCLCHECK OFF-NEXT code` and `OFF`/`ON` blocks hide named codes (still returned, not counted); a site profile adds name patterns, allowed values, new-dataset prefixes, extra keywords and per-code severities |
| **Procedures** | In-stream PROCs, and catalogued PROCs and INCLUDE members supplied in the Library panel: symbolic parameters, DD overrides and procedure steps. A PROC that can't be found is a warning |

**Diagnostic codes**

| Prefix | Group | Default severity |
|---|---|---|
| `JCLL` | Reading lines | Error (in-stream data without its delimiter is a warning) |
| `JCLP` | Structure | Error |
| `JCLO` | Statement order | Error |
| `JCLD` | DD statements | Error (duplicates and path options without PATH are warnings; in-stream JCL for the internal reader is information) |
| `JCLK` | Keywords | Warning (a missing required parameter, a positional after a keyword, too many positionals and misused keywords are errors) |
| `JCLS` | Parameter values | Warning (invalid DISP and dataset names are errors; quoted names are information) |
| `JCLN` | Names | Error (site profile rules are warnings) |
| `JCLR` | Procedures and INCLUDE | Error (missing PROCs and members, and unmatched DD overrides, are warnings) |
| `JCLJ` | JES2 and JES3 statements | Warning (a JES3-looking comment under JES2 is information) |
| `JCLC` | IF conditions | Error |
| `JCLG` | Job groups | Error |
| `JCLX` | Suppressions | Information |
| `JCLF` | Dataset flow | Warning (reading a temporary dataset nobody created, and a referback to nothing, are errors) |

Each code has its own default severity, set in the catalogue in `errors.js`; the table gives the usual one for each group. Help in the workbench lists and explains every code, with its severity. A job counts as **valid** when it has no errors. Warnings do not make a job invalid.

**Example diagnostic**

> **WARNING** L2:26 `JCLK001`
> 'REGON' is not a recognized keyword for a EXEC statement.
> FIX › Did you mean 'REGION'?

### 4.4 API

| Endpoint | Description |
|---|---|
| `GET /api/levels` | Returns `{ levels, defaultLevel, defaultJes }`: the supported z/OS levels, oldest first, each as `{ level, jes3 }` where `jes3` says whether JES3 can be chosen at it. The workbench's level picker uses it. |
| `POST /api/validate` | Body `{ "source": "<JCL text>", "zosLevel": "2.5", "jes": "JES3" }` (2 MB limit). `zosLevel` is optional: one of `2.3`, `2.4`, `2.5`, `3.1` or `3.2`, with `3.2` the default. Any other level gets a 400 response listing the supported ones. `jes` is optional: `JES2` (the default) or `JES3`; JES3 can only be chosen at z/OS 2.5 or earlier, since IBM removed it in 3.1, and other values get a 400 response. `profile` is optional: a site profile (`names`, `allowed`, `dsnPrefixes`, `extraKeywords`, `severity`); an invalid one gets a 400 response naming the field. `library` is optional: up to 50 `{ dsn, member, source }` entries holding catalogued procedures and INCLUDE members (leave `dsn` out for the system procedure library); they are searched in the job's JCLLIB order, and an invalid entry gets a 400 response naming it. Returns `{ diagnostics, ast, datasets, stats, zosLevel, jes }`, where `zosLevel` and `jes` are the ones used. A diagnostic found inside a library member also has `member` (for example `CAMPBEL.PROCS.JCL(MYPROC2)`), and its line and column are within that member. A keyword or statement that exists but not at the chosen level gets the warning `JCLK005`. Each diagnostic has `code`, `severity`, `line`, `column`, `length`, `message`, `suggestion` and `source`. `ast` has `jobs` (one entry per JOB statement) and `procs`. `datasets` lists, for each job that names a dataset, its steps and each dataset's touches (`{ step, dd, line, column, actions }`, with actions `N`, `R`, `M`, `P` and `D`). Diagnostics hidden by `//* JCLCHECK` comments have `suppressed: true`. `stats` has `errors`, `warnings`, `info`, `suppressed`, `statementCount`, `jobCount`, `stepCount` (across all jobs), `procCount` and `valid` |
| `POST /api/format` | Body `{ "source": "<JCL text>" }`. Lays the JCL out in the usual columns and returns `{ text, changed, notes, refused }`. Comments, in-stream data, JES statements, IF conditions and statements with sequence numbers are left as written; a result that wouldn't mean the same is refused. |
| `GET /api/keywords` | `?zos=<level>` (default `3.2`; an unknown level gets a 400 response). Returns `{ zosLevel, statements }`: for each statement, its keywords available at that level with `text`, `since` (the level it appeared in, or null), `reference` (a search of the IBM JCL Reference) and, where they apply, `values` or `positions` describing its values. |
| `GET /api/health` | Returns `{ "ok": true }` |

### 4.5 Command line

`validator/bin/jclcheck.js <files or globs>` checks JCL files with the same validator as the API and prints `file:line:column  severity  code  message`, JSON or SARIF 2.1.0 (`--format`). Options: `--zos`, `--jes`, `--library <dir>`, `--profile <file>` and `--max-warnings <n>`. It exits with 0 (no errors), 1 (errors, or too many warnings) or 2 (it couldn't run). Usage is counted only when the user opts in (`JCLCHECK_TELEMETRY=1` or `--telemetry`), never with `DO_NOT_TRACK=1`, through `POST /api/usage`.

---

## 5. Known limits

These are by design, since the tool has no access to a mainframe:

- Datasets can't be confirmed to exist, and catalogued procedures and INCLUDE members are only checked when the user supplies them in the Library panel.
- IF/THEN/ELSE conditions are checked, but no return codes are simulated, so every step is checked whichever branch it is in.

---

## 6. Design and branding

- **Marketing pages:** A bright theme with a green brand colour (`#189a63`), Sora for headings and IBM Plex Sans for body text.
- **Workbench:** A dark theme inspired by 3270 terminals (`.workbench-theme`), with IBM Plex Mono and IBM Plex Sans Condensed, PF-key labels, and upper-case status text.
- **SEO and sharing:** Each page sets its own title, description, canonical URL and Open Graph/Twitter tags. The page also includes SoftwareApplication and Organization structured data, FAQPage structured data on the landing page, a sitemap, robots.txt, a web manifest, a full set of favicons and a 1200×630 social image. `www.jclcheck.xyz` redirects to the apex domain.

---

## 7. Tech stack

| Area | Choice |
|---|---|
| Frontend | Vue 3 with Vite, single-page app |
| Routing | Vue Router (`/`, `/about`, `/app`) with per-route SEO meta |
| Backend | Node.js with Express and CORS |
| Validation engine | The `validator/` package, with no dependencies: our own lexer → parameter tokeniser → parser (AST) → rule modules, plus the formatter and the `jclcheck` command. Messages come from a central diagnostic catalogue (`errors.js`) |
| Keyword data | Tables based on the IBM JCL Reference (`keywords.js`) |
| Tests | Node's built-in test runner in `validator/` (rules, fixtures, formatter, command) and `backend/` (API); Vitest in `frontend/` |
| Frontend hosting | Netlify (SPA fallback, security headers, www → apex redirect) |
| API hosting | Separate service. The frontend reaches it through `VITE_API_BASE` (proxied to `:4000` in development) |
| Domain | jclcheck.xyz |

---

## 8. Planned work

Planned features, in build order, are in [Features.md](Features.md).
