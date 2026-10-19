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
- **Privacy:** JCL is sent to the API to be checked, and is never stored or counted. The site does not save user code between visits. Usage is counted anonymously with GoatCounter, with no cookies and no personal data: pages visited, where visits come from, browser, device size and country, which features are used, and which error codes appear. Nothing is counted when the browser sends Do Not Track or Global Privacy Control.
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

- **Editor:** A text editor with line numbers. Lines that have problems get a coloured dot in the gutter (error or warning), and hovering over the dot shows the messages. Tab inserts spaces, and spellcheck and autocorrect are turned off.
- **Live checking:** The JCL is checked automatically about half a second after the user stops typing, and once when the page loads.
- **Diagnostics panel:** Lists every problem in line order. Each one shows its severity, its line and column (`L12:5`), its code (`JCLK001`), a message and a "FIX ›" suggestion. Clicking an entry scrolls the editor to that line. When there are no problems, the panel shows a summary of the statements, steps and procedures that were checked.
- **Status indicator:** The header shows READY, VALIDATING, CLEAN — 0 ERRORS, the number of errors, or API UNREACHABLE.
- **PF-key action bar:** A button bar styled like 3270 terminal PF keys:
  - **F1 Help:** opens in-app help that explains what is checked, the error code groups and the tool's limits.
  - **F5 Validate:** checks the JCL right away.
  - **F9 Sample:** cycles through the bundled examples.
  - **F12 Clear:** empties the editor.
- **Samples:** Three built-in examples: a clean job, a broken job with many typical mistakes, and a job that uses an in-stream PROC with symbolic parameters and DD overrides.

### 4.3 What is checked

| Area | Checks |
|---|---|
| **Lexing** | `//` record format, `//*` comments, continuation lines (trailing comma or open parenthesis), unterminated quotes, lines over 80 columns, in-stream data (`DD *` / `DD DATA` up to the delimiter) |
| **Structure** | Recognises JOB, EXEC, DD, PROC, PEND, SET, IF/THEN/ELSE/ENDIF and INCLUDE. Checks unmatched parentheses and that IF/ENDIF and PROC/PEND are balanced and nested correctly |
| **Ordering** | JOB comes first, EXEC comes before its DDs, and there is only one JOB per job stream |
| **DD statements** | Duplicate ddnames within a step. Each DD must have exactly one data source (DSN, DUMMY, SYSOUT or in-stream data) |
| **Keywords** | Every JOB, EXEC and DD keyword is checked against IBM reference tables, with "Did you mean…?" suggestions for typos. EXEC must have PGM or PROC |
| **Parameter values** | DISP, SPACE, DCB (RECFM/DSORG/LRECL/BLKSIZE), REGION, TIME and DSN qualifier rules (up to 8 characters per qualifier, up to 22 qualifiers, up to 44 characters in total, valid first character) |
| **Names** | Step, DD and job names are 1–8 characters and start with a letter or a national character (`$ # @`) |
| **Procedures** | In-stream PROC bodies are checked like the main job. `EXEC PROC=` calls are resolved, and calls to unknown PROCs are warnings because they may be catalogued. `&SYM` references are checked against the PROC defaults, and DD overrides (`ddname` or `step.ddname`) are matched to the procedure's DDs |

**Diagnostic codes**

| Prefix | Group | Default severity |
|---|---|---|
| `JCLL` | Lexer | Error |
| `JCLP` | Parser / structure | Error |
| `JCLO` | Ordering | Error |
| `JCLD` | DD rules | Error |
| `JCLK` | Keywords | Warning |
| `JCLS` | Parameter value syntax | Warning |
| `JCLN` | Name syntax | Error |
| `JCLR` | Procedure resolution | Error (unresolved PROC is a warning) |

A job counts as **valid** when it has no errors. Warnings do not make a job invalid.

**Example diagnostic**

> **WARNING** L2:26 `JCLK001`
> 'REGON' is not a recognized keyword for a EXEC statement.
> FIX › Did you mean 'REGION'?

### 4.4 API

| Endpoint | Description |
|---|---|
| `POST /api/validate` | Body `{ "source": "<JCL text>", "zosLevel": "2.5", "jes": "JES3" }` (2 MB limit). `zosLevel` is optional: one of `2.3`, `2.4`, `2.5`, `3.1` or `3.2`, with `3.2` the default. Any other level gets a 400 response listing the supported ones. `jes` is optional: `JES2` (the default) or `JES3`; JES3 can only be chosen at z/OS 2.5 or earlier, since IBM removed it in 3.1, and other values get a 400 response. `library` is optional: up to 50 `{ dsn, member, source }` entries holding catalogued procedures and INCLUDE members (leave `dsn` out for the system procedure library); they are searched in the job's JCLLIB order, and an invalid entry gets a 400 response naming it. Returns `{ diagnostics, ast, stats, zosLevel, jes }`, where `zosLevel` and `jes` are the ones used. A diagnostic found inside a library member also has `member` (for example `CAMPBEL.PROCS.JCL(MYPROC2)`), and its line and column are within that member. A keyword or statement that exists but not at the chosen level gets the warning `JCLK005`. Each diagnostic has `code`, `severity`, `line`, `column`, `length`, `message`, `suggestion` and `source`. `ast` has `jobs` (one entry per JOB statement) and `procs`. `stats` has `errors`, `warnings`, `info`, `statementCount`, `jobCount`, `stepCount` (across all jobs), `procCount` and `valid` |
| `GET /api/health` | Returns `{ "ok": true }` |

---

## 5. Known limits

These are by design, since the tool has no access to a mainframe:

- Catalogued procedures and datasets cannot be confirmed to exist.
- The bodies of IF/THEN/ELSE blocks are checked for balance and nesting, but they are not excluded based on their conditions.
- The classic continuation-column rules (columns 4–16) are applied loosely, to match how most modern shops write JCL.

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
| Validation engine | Our own lexer → parameter tokeniser → parser (AST) → rule modules (`ddRules`, `paramRules`, `procRules`). Messages come from a central diagnostic catalogue (`errors.js`) |
| Keyword data | Tables based on the IBM JCL Reference (`keywords.js`) |
| Tests | Fixture-based smoke tests (`npm test` in `backend/`), with no test framework |
| Frontend hosting | Netlify (SPA fallback, security headers, www → apex redirect) |
| API hosting | Separate service. The frontend reaches it through `VITE_API_BASE` (proxied to `:4000` in development) |
| Domain | jclcheck.xyz |

---

## 8. Planned work

Planned features, in build order, are in [Features.md](Features.md).
