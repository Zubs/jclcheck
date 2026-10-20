# Proposal

## Why

Many users are learning JCL. `DISP=(NEW,CATLG,DELETE)` is easier to learn from "Create the dataset; catalog it if the step ends normally; delete it if the step abends" than from the reference.

## What Changes

- `backend/src/descriptions.js`: a plain-English description of every keyword in the JOB, EXEC, DD, JCLLIB, NOTIFY and job group tables, of each allowed value in their value rules, and of DISP, SPACE and MSGLEVEL by position.
- `GET /api/keywords?zos=<level>` returns the descriptions of the keywords available at that level, with the level each appeared in (when marked) and a link that searches the IBM JCL Reference.
- Workbench: hovering over a keyword or value shows a panel with any diagnostic there first, then the description, each part of the value in turn, the level and the link; an unknown keyword says "No description: not a known keyword". Alt+K shows it for the keyword at the cursor. Descriptions are loaded once per level; without them hovering shows nothing.
- A test checks that every keyword in the tables, and every allowed value, has a description.

## Capabilities

### New Capabilities
- `keyword-explanations`: keyword descriptions, the API and the hover panel.

### Modified Capabilities

## Impact

- Backend: new `src/descriptions.js`; `index.js` (`/api/keywords`).
- Frontend: new `src/explain.js`; `highlight.js` (each line's statement), `Editor.vue` (panel), `Workbench.vue` (loading, Alt+K), `HelpModal.vue`, `api.js`, `analyticsEvents.js`.
- Docs: README, Spec.md.
