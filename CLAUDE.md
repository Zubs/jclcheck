# CLAUDE.md

## Project

JCLcheck (https://jclcheck.xyz) is a free online checker for JCL (Job Control Language), built for students and new mainframe developers who don't have a z/OS system to practise on. Users paste JCL into a terminal-style workbench and see each problem straight away, with its line and column, an error code, a plain-English explanation and a suggested fix. The checking is done by our own lexer, parser and rule engine, based on the IBM JCL Reference, with no mainframe connection. It is static checking only: nothing is run, and datasets and catalogued procedures can't be confirmed. There are no accounts. JCL is never stored, and usage is counted anonymously with GoatCounter.

- [Spec.md](Spec.md) describes the product.
- [Features.md](Features.md) lists every feature in build order, with how it works and its tests. Build features in that order, and tick each one in the progress list once it's complete.
- Each feature is planned and built as an OpenSpec change. `/opsx:propose` plans it, `/opsx:apply` builds it, and `/opsx:archive` archives it and syncs its specs into `openspec/specs/`.

## Tech stack

| Area | Choice |
|---|---|
| Backend | Node.js 22 or later, Express 4, CommonJS (`backend/`), using the validator package by relative path |
| Validator | Our own lexer, parser and rule engine, formatter and `jclcheck` command in `validator/`, a package with no dependencies |
| Frontend | Vue 3 with `<script setup>`, Vue Router 4, Vite 5, ES modules (`frontend/`) |
| Styling | Our own CSS: `style.css` for theme tokens, and scoped styles in each component |
| Validator and backend tests | Node's built-in test runner (`node:test`), with fixtures in `validator/test/fixtures/` |
| Frontend tests | Vitest with Vue Test Utils and jsdom, in `frontend/tests/` |
| Linting and formatting | ESLint 9 with its flat config (`eslint.config.js` in each package): the recommended JavaScript rules, `@stylistic/eslint-plugin` for formatting, and `eslint-plugin-vue` on the frontend |
| Analytics | GoatCounter, through `frontend/src/analytics.js` and `backend/src/analytics.js` only |
| Frontend hosting | Netlify (`frontend/netlify.toml`) |
| Backend hosting | Render, at https://jclcheck.onrender.com |
| Planning | OpenSpec (`openspec/`) |

## Coding rules

- **Formatting is enforced by lint.** The rules:
  - 4-space indents in `.js` files, and 2 spaces in `.vue` files.
  - Single quotes, semicolons, and no trailing commas.
  - Braces on every block, and a blank line after a closing brace.

  `npm run lint:fix` fixes most problems.
- **Match the surrounding code.** Each file starts with a short comment saying what it's for. Follow the naming and structure of sibling files.
- **Comments explain why, not what.** Keep a file's opening comment and comments on non-obvious decisions. Don't narrate what the code already says.
- **Keep it simple.** Write the simplest code that meets the requirement. Don't add abstractions, layers or options that aren't needed yet.
- **Use what's built in first.** Use Node, Express, Vue and the browser before writing custom logic. Don't add a dependency without asking. The validator stays dependency-free.
- **Diagnostics go through the catalog.** Every diagnostic is created with `makeDiagnostic` from a code in the `CATALOG` in `validator/src/errors.js`, with a plain-English message and a fix.
- **Privacy is enforced in code.** Never send JCL text, anything typed, or the part of the address after `#` to analytics or any third party. Analytics events must be on the allowed list in `frontend/src/analyticsEvents.js`.

## Tests

- **Backend fixtures:** each fixture is a `.jcl` file with a matching `.expected.json` that lists its exact diagnostics (code, severity, line and column).
- **Todo markers:** behaviour that isn't built yet is marked `todo` with its feature number from Features.md. When a feature makes a todo fixture pass, remove the marker; the run fails until you do.
- **Expected failures:** a known frontend bug is a `test.fails(...)` test, named with the feature that fixes it. When the feature is built, turn it into a normal `test`.
- **No network in tests:** frontend tests never make network requests or load the real GoatCounter script, and `frontend/tests/setup.js` enforces this.
- **Never weaken a test to make it pass.** Change an expected result only when the behaviour is meant to change, and say so.

## After every plan

Once a plan has been applied, run these checks and fix every issue they report:

```bash
cd validator && npm run lint && npm test
cd backend && npm run lint && npm test
cd frontend && npm run lint && npm test && npm run build
```

Repeat until lint, the three test suites and the build all pass with no errors. Fix lint problems in the code rather than turning rules off. Only turn a rule off for a project-wide convention, with a comment in `eslint.config.js` saying why. Don't consider the work finished until they do.

Run `npm` commands from inside `validator/`, `backend/` or `frontend/`, never from the repository root. Running `npx vitest` at the root fetches a different Vitest and leaves a stray `node_modules/` behind.
