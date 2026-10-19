# Proposal

## Why

Every shop has local keywords, exits and standards. Without a way to silence a known false positive, users learn to ignore the panel; without site rules, the tool can't check what reviewers care about.

## What Changes

- Suppressions as JCL comments, so the job still runs unchanged: `//* JCLCHECK OFF-NEXT code[,code]` (next statement, all its lines), `//* JCLCHECK OFF code[,code]` until `//* JCLCHECK ON code[,code]` or the end of the job. Codes must be named.
- Suppressed diagnostics are still returned with `suppressed: true`, and aren't counted in `stats` or `valid`; `stats.suppressed` counts them.
- New info codes `JCLX001` (unknown or missing code in a suppression) and `JCLX002` (a suppression that hid nothing).
- A site `profile` sent with a check: `names` (wildcard patterns for job, step and DD names), `allowed` values per keyword, `dsnPrefixes` for new datasets, `extraKeywords` for JOB, EXEC and DD, and `severity` per code (`error`, `warning`, `info` or `off`). Breaking a rule gets `JCLN002` (warning) naming it. An invalid profile gets a 400 response naming the field.
- Wildcards (`*`, `%`) are matched with a linear backtracking walk, never regular expressions.
- Workbench: a PROFILE panel (JSON), saved with the draft and included in shared links; the panel lists suppressed diagnostics on request ("N SUPPRESSED"); Help explains both.
- **Behaviour change:** `stats` gains `suppressed`.

## Capabilities

### New Capabilities
- `suppressions-profile`: suppressions, the site profile and their workbench parts.

### Modified Capabilities

## Impact

- Backend: new `src/profile.js`, `src/suppressions.js`, `src/rules/profileRules.js`; `errors.js`, `validator.js`, `index.js`, `rules/paramRules.js` (extra keywords).
- Frontend: new `ProfilePanel.vue`; `Workbench.vue`, `ErrorPanel.vue`, `HelpModal.vue`, `api.js`, `share.js`, `diagnosticCodes.js`, `analyticsEvents.js`.
- Docs: README and Spec.md. The CLI (feature 38) takes the profile from a file.
