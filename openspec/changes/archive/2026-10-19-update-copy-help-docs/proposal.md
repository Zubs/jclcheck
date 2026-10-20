# Proposal

## Why

After features 3–29 the help, landing page, About page, README and Spec.md describe an older tool. Some copy is wrong outright: the first FAQ answer and the About page say checks run in the browser, but JCL is sent to the API. Help lists only the code groups, so users can't look up most codes they meet.

## What Changes

- **Where checking happens:** the first FAQ answer, the About page and the landing trust line say JCL is sent to the JCLcheck API and not stored there. The privacy copy (FAQ, Help, Spec.md) adds that the draft stays in the user's own browser and a shared link carries the JCL inside the link itself.
- **Help** names the supported z/OS levels and the default, says JES3 is only checked at 2.5 and earlier, keeps the column, keys and Library sections, and lists **every diagnostic code** with a one-line description, from a new `diagnosticCodes.js`. A test keeps that list identical to the catalog in `backend/src/errors.js`.
- **FAQ** "what does it validate" is updated; the FAQ structured data still comes from the same list.
- **README:** "What's validated", the API section (`zosLevel`, `jes`, `library`, `member`, `ast.jobs`, `ast.jobGroups`, `jobCount`, `GET /api/levels`) with an example request and response that a backend test checks against the real API, and the limitations (dropping the loose continuation columns, fixed by features 4–5).
- **Spec.md:** privacy line, workbench features (picker, library, highlighting, cursor, shortcuts, drafts, sharing), the "What is checked" table and code groups, and known limits.
- The About-page "Thanks" line needs Nick's agreement, so it is added to Features.md feature 41 as a question rather than to the page.

## Capabilities

### New Capabilities
- `site-copy`: what the site, help and docs promise, kept in step with the tool.

### Modified Capabilities

## Impact

- Frontend: new `src/diagnosticCodes.js`; `HelpModal.vue`, `faq.js`, `pages/About.vue`, `pages/Landing.vue`; tests.
- Backend: a README example test.
- Docs: README.md, Spec.md, Features.md.
