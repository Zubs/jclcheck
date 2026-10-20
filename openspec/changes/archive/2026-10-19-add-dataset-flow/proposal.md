# Proposal

## Why

Each DD is checked on its own, so mistakes that only show across steps — reading a temporary dataset no step creates, passing one nobody reads, a referback to a step that doesn't exist — are only found when the job runs.

## What Changes

- A new rules file, `flowRules.js`, follows each dataset through a job's steps, including the steps of called in-stream and catalogued PROCs (with their dotted DD overrides), and through PROCs nobody calls.
- A new `JCLF` group of diagnostics:
  - `JCLF001` (error): a temporary dataset is read before any step creates or passes it.
  - `JCLF002` (warning): a dataset is passed but no later step reads it.
  - `JCLF003` (warning): a dataset is created with `NEW,CATLG` twice with no delete in between.
  - `JCLF004` (warning): a dataset is read after an earlier step deletes it.
  - `JCLF005` (error): a referback (`DSN=*.S1.OUT`, `VOL=REF=*.S1.OUT`) names a step or DD that doesn't exist or comes later.
- Symbol values known from PROC defaults, the calling EXEC and SET are filled in; names still symbolic, and relative GDG generations, are skipped.
- A step inside an IF/THEN/ELSE makes a `JCLF001` that depends on it a warning.
- The API response gains `datasets`: for each job's dataset, the steps that touch it and how (`N`, `R`, `M`, `P`, `D`).
- The diagnostics panel gets a DATASETS tab with a grid of datasets by steps; clicking a cell goes to that DD.
- SET statements keep their values (`job.sets[].values`), so flow can use them.

## Capabilities

### New Capabilities
- `dataset-flow`: dataset flow checks, the `datasets` response and the grid.

### Modified Capabilities

## Impact

- Backend: new `src/rules/flowRules.js`, `errors.js` (JCLF001–005), `parser.js` (SET values), `validator.js` (`datasets`), `index.js` unchanged.
- Frontend: `ErrorPanel.vue` (tabs and grid), `Workbench.vue` (passes `datasets`, handles cell clicks), `diagnosticCodes.js` (JCLF group), `analyticsEvents.js` (feature marker removed).
- Docs: README and Spec.md.
